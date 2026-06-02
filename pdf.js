/* ============================================================
   BillKaro — PDF Generation (pdf.js)
   Uses jsPDF + jsPDF-AutoTable
   ============================================================ */

const BKPdf = {

  /* Main bill PDF generator */
  generateBill: async (bill, options = {}) => {
    const { jsPDF } = window.jspdf;
    const size = options.size || 'a4';
    const orientation = options.orientation || 'portrait';

    const doc = new jsPDF({ orientation, unit: 'mm', format: size });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 15; /* margin */

    /* Load settings */
    const shop  = await BKDb.getSetting('shop')  || {};
    const bank  = await BKDb.getSetting('bank')  || {};
    const theme = await BKDb.getSetting('theme') || {};
    const print = await BKDb.getSetting('print') || { lo: true, qr: true, bk: true, gs: true, ft: true, sg: false };
    const logo  = await BKDb.getSetting('logo');
    const qrImg = await BKDb.getSetting('qr');
    const color = BKPdf._hexToRgb(theme.color || '#2563eb');

    let y = M;

    /* ---- HEADER ---- */
    /* Color bar */
    doc.setFillColor(color.r, color.g, color.b);
    doc.rect(0, 0, W, 22, 'F');

    /* Logo */
    if (print.lo && logo) {
      try { doc.addImage(logo, 'PNG', M, 3, 28, 16, '', 'FAST'); } catch(e) {}
      /* Shop name next to logo */
      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      doc.text(shop.sn || 'BillKaro', M + 32, 12);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text(shop.tg || '', M + 32, 17);
    } else {
      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      doc.text(shop.sn || 'BillKaro', M, 13);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text(shop.tg || '', M, 18);
    }

    /* TAX INVOICE label — right side */
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('TAX INVOICE', W - M, 10, { align: 'right' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(bill.no || '', W - M, 16, { align: 'right' });
    doc.text(bill.date || '', W - M, 20, { align: 'right' });

    y = 28;

    /* ---- SHOP INFO + BILL TO (two columns) ---- */
    doc.setTextColor(60, 60, 60); doc.setFontSize(8);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(color.r, color.g, color.b);
    doc.text('FROM', M, y + 4);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
    doc.text(shop.a1 || '', M, y + 9);
    doc.text(`${shop.ct || ''}, ${shop.st || ''} - ${shop.pn || ''}`, M, y + 13);
    doc.text(`Ph: ${shop.mb || ''}`, M, y + 17);
    if (print.gs && shop.gs) doc.text(`GSTIN: ${shop.gs}`, M, y + 21);

    /* Bill To — right column */
    const col2 = W / 2 + 5;
    doc.setFont('helvetica', 'bold'); doc.setTextColor(color.r, color.g, color.b);
    doc.text('BILL TO', col2, y + 4);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 40);
    doc.text(bill.cn || 'Guest', col2, y + 9);
    doc.setFont('helvetica', 'normal');
    if (bill.cm2) doc.text(`Ph: ${bill.cm2}`, col2, y + 13);
    if (bill.ca) doc.text(bill.ca, col2, y + 17);
    if (bill.cg) doc.text(`GSTIN: ${bill.cg}`, col2, y + 21);

    y += 28;

    /* Divider */
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3);
    doc.line(M, y, W - M, y);
    y += 5;

    /* ---- ITEMS TABLE ---- */
    const tableData = bill.items.map((it, i) => [
      i + 1,
      it.pn + (it.ic ? ' *' : ''),
      it.gst + '%',
      it.qty,
      '₹' + it.rate.toFixed(2),
      '₹' + it.amt.toFixed(2)
    ]);

    doc.autoTable({
      startY: y,
      head: [['#', 'Item', 'GST', 'Qty', 'Rate', 'Amount']],
      body: tableData,
      margin: { left: M, right: M },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: {
        fillColor: [color.r, color.g, color.b],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 16, halign: 'center' },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.row.index === tableData.length - 1) data.cell.styles.lineWidth = { bottom: 0.5 };
      }
    });

    y = doc.lastAutoTable.finalY + 6;

    /* ---- TOTALS (right aligned) ---- */
    const totX = W - M - 70;
    const totW = 70;

    const addTotRow = (label, val, bold = false, clr = null) => {
      if (bold) { doc.setFont('helvetica', 'bold'); doc.setFontSize(10); }
      else { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); }
      if (clr) doc.setTextColor(clr[0], clr[1], clr[2]);
      else doc.setTextColor(80, 80, 80);
      doc.text(label, totX, y);
      doc.text(val, W - M, y, { align: 'right' });
      y += 5;
    };

    addTotRow('Subtotal:', '₹' + bill.sub.toFixed(2));
    if (bill.gst > 0) addTotRow('GST:', '₹' + bill.gst.toFixed(2));
    if ((bill.cd || 0) > 0) addTotRow('Previous Due:', '+₹' + bill.cd.toFixed(2), false, [180, 100, 0]);

    /* Total box */
    doc.setFillColor(color.r, color.g, color.b);
    doc.roundedRect(totX - 2, y - 4, totW + 4, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
    doc.text('TOTAL', totX + 1, y + 2);
    doc.text('₹' + bill.total.toFixed(2), W - M - 1, y + 2, { align: 'right' });
    y += 12;

    addTotRow(`Paid (${bill.pm}):`, '-₹' + bill.paid.toFixed(2), false, [22, 163, 74]);
    if ((bill.nd || 0) > 0) {
      addTotRow('Balance Due:', '₹' + bill.nd.toFixed(2), true, [220, 38, 38]);
    } else {
      addTotRow('✓ Fully Paid', '', false, [22, 163, 74]);
    }

    /* ---- QR CODE (left side of totals area) ---- */
    if (print.qr && qrImg) {
      try {
        doc.addImage(qrImg, 'PNG', M, doc.lastAutoTable.finalY + 6, 30, 30, '', 'FAST');
        doc.setFontSize(7); doc.setTextColor(100, 100, 100); doc.setFont('helvetica', 'normal');
        doc.text('Scan to Pay', M + 15, doc.lastAutoTable.finalY + 38, { align: 'center' });
      } catch(e) {}
    }

    /* ---- BANK DETAILS ---- */
    if (print.bk && (bank.an || bank.ui)) {
      y += 4;
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(M, y - 4, W - 2 * M, bank.an && bank.ui ? 18 : 12, 2, 2, 'F');
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(color.r, color.g, color.b);
      doc.text('Payment Details', M + 3, y + 1);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
      if (bank.an) doc.text(`Bank: ${bank.bn || ''} | A/C: ${bank.an} | IFSC: ${bank.if || ''} | ${bank.at || ''}`, M + 3, y + 6);
      if (bank.ui) doc.text(`UPI: ${bank.ui}${bank.um ? ' | ' + bank.um : ''}`, M + 3, y + (bank.an ? 11 : 6));
      y += bank.an && bank.ui ? 22 : 16;
    }

    /* ---- NOTE ---- */
    if (bill.note) {
      doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(120, 120, 120);
      doc.text(`Note: ${bill.note}`, M, y); y += 6;
    }

    /* ---- FOOTER ---- */
    const footerY = H - 18;
    if (print.ft && shop.ft) {
      doc.setDrawColor(220, 220, 220); doc.line(M, footerY - 3, W - M, footerY - 3);
      doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(140, 140, 140);
      doc.text(shop.ft, W / 2, footerY, { align: 'center' });
    }

    /* ---- SIGNATURE ---- */
    if (print.sg) {
      doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.3);
      doc.line(W - M - 40, footerY - 8, W - M, footerY - 8);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
      doc.text('Authorized Signature', W - M - 20, footerY - 3, { align: 'center' });
    }

    /* Page number */
    doc.setFontSize(7); doc.setTextColor(180, 180, 180);
    doc.text(`Page 1 of 1 | Generated by BillKaro`, W / 2, H - 5, { align: 'center' });

    return doc;
  },

  /* Save PDF to file */
  saveBill: async (bill) => {
    const doc = await BKPdf.generateBill(bill);
    doc.save(`${bill.no}-${bill.cn || 'bill'}.pdf`);
  },

  /* Print bill */
  printBill: async (bill) => {
    const doc = await BKPdf.generateBill(bill);
    doc.autoPrint();
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const w = window.open(url);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  },

  /* Share via WhatsApp */
  shareBillWhatsApp: async (bill) => {
    const doc = await BKPdf.generateBill(bill);
    const blob = doc.output('blob');
    const file = new File([blob], `${bill.no}.pdf`, { type: 'application/pdf' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `Bill ${bill.no}`, text: `Bill from ${(await BKDb.getSetting('shop'))?.sn || 'BillKaro'}` });
    } else {
      const mobile = bill.cm2 || '';
      const msg = encodeURIComponent(`Bill ${bill.no} — ₹${bill.total} — ${(await BKDb.getSetting('shop'))?.sn || 'BillKaro'}`);
      window.open(`https://wa.me/${mobile}?text=${msg}`, '_blank');
    }
  },

  /* Customer ledger PDF */
  generateLedger: async (customerId) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const M = 15;
    const shop = await BKDb.getSetting('shop') || {};
    const theme = await BKDb.getSetting('theme') || {};
    const color = BKPdf._hexToRgb(theme.color || '#2563eb');
    const customer = await BKDb.get('customers', customerId);
    const bills = (await BKDb.getByIndex('bills', 'customerId', customerId)).sort((a, b) => a.date.localeCompare(b.date));

    /* Header */
    doc.setFillColor(color.r, color.g, color.b);
    doc.rect(0, 0, W, 20, 'F');
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('CUSTOMER LEDGER', M, 13);
    doc.setFontSize(9); doc.text(shop.sn || 'BillKaro', W - M, 13, { align: 'right' });

    let y = 28;
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 40);
    doc.text(customer?.name || 'Customer', M, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text(customer?.mobile || '', M, y + 5);
    y += 14;

    const rows = bills.map(b => [b.date, b.no, '₹' + b.total.toFixed(2), '₹' + b.paid.toFixed(2), '₹' + (b.nd || 0).toFixed(2)]);
    doc.autoTable({
      startY: y,
      head: [['Date', 'Bill No.', 'Total', 'Paid', 'Balance']],
      body: rows,
      margin: { left: M, right: M },
      styles: { fontSize: 9 },
      headStyles: { fillColor: [color.r, color.g, color.b], textColor: 255 },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', textColor: [220, 38, 38] } }
    });

    doc.save(`Ledger-${customer?.name || 'customer'}.pdf`);
  },

  /* Helper: hex to rgb */
  _hexToRgb: (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }
};
