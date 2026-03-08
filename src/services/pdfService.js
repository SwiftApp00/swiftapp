import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Generates a branded Quote PDF for Swift Transport & Solutions
 * @param {Object} quoteData - The quote information
 * @param {Object} clientData - The client information
 */
export const generateQuotePDF = (quoteData, clientData) => {
    const doc = new jsPDF();
    const BRAND_COLOR = [139, 0, 0]; // Dark Red #8B0000
    const LIGHT_GRAY = [245, 245, 245];

    // 1. Header Logo
    // NOTE: For a real app, we'd use a base64 string of the logo. 
    // Since we are in a browser environment, we can fetch it or use the URL if jspdf supports it.
    // For this implementation, I'll use a placeholder placeholder 'S' if the logo fetch fails, 
    // but I'll attempt to draw the logo area as per the mockup.

    const logoUrl = 'https://atbocciidldnhaclyerh.supabase.co/storage/v1/object/public/assets/logoswift.png';

    // Helper to add the header/footer on each page if needed, but quotes are usually 1 page.
    const addBranding = () => {
        // Top Logo area
        doc.setFont("helvetica", "bold");
        doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
        doc.setFontSize(28);
        doc.text("S", 105, 20, { align: "center" });

        doc.setFont("times", "bold");
        doc.setFontSize(18);
        doc.text("Swift Transport & Solutions", 105, 30, { align: "center" });

        // "QUOTATION" Title
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(24);
        doc.text("QUOTATION", 20, 50);

        // Quote Info (Right side)
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const quoteNum = quoteData.quote_number || 'QT-XXXX-XXXX';
        const date = new Date(quoteData.created_at || Date.now()).toLocaleDateString('en-GB');
        doc.text(`Quote number: ${quoteNum}`, 190, 45, { align: "right" });
        doc.text(`Date: ${date}`, 190, 50, { align: "right" });

        // Dark Red Bar (Address/Contact)
        doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
        doc.rect(0, 60, 210, 25, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text("Address: 138 W Broad, Bresseth, RZ", 20, 68);
        doc.text("Phone: +070 3867727", 20, 73);
        doc.text("Email: info@swifttransport.ie", 20, 78);

        doc.text("Company registration Nr. 2102000", 190, 68, { align: "right" });
        doc.text("VAT Registration Nr.: 201200000", 190, 73, { align: "right" });
    };

    addBranding();

    // 2. Bill To Section
    doc.setFillColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
    doc.rect(20, 95, 170, 35, 'F');

    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 25, 102);

    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${clientData.name || 'N/A'}`, 25, 108);
    doc.text(`Address: ${clientData.street || ''} ${clientData.house_number || ''}, ${clientData.city || ''}`, 25, 113);
    doc.text(`Eircode: ${clientData.eircode || ''}`, 25, 118);
    doc.text(`Phone: ${clientData.phone || clientData.whatsapp || ''}`, 25, 123);
    doc.text(`Email: ${clientData.email || ''}`, 25, 128);

    // 3. Items Table
    const tableData = (quoteData.items || []).map((item, index) => [
        index + 1,
        item.description || 'Service',
        item.quantity || 1,
        `€${Number(item.unit_price || 0).toFixed(2)}`,
        `€${Number(item.total || 0).toFixed(2)}`
    ]);

    // If no items, add a placeholder
    if (tableData.length === 0) {
        tableData.push([1, quoteData.description || 'Transport Service', 1, `€${Number(quoteData.price || 0).toFixed(2)}`, `€${Number(quoteData.price || 0).toFixed(2)}`]);
    }

    doc.autoTable({
        startY: 140,
        head: [['Item #', 'Description', 'Qty', 'Unit Price (€)', 'Total (€)']],
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: [100, 0, 0], // Darker red for header
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 20 },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'right', cellWidth: 35 },
            4: { halign: 'right', cellWidth: 35 }
        },
        alternateRowStyles: {
            fillColor: LIGHT_GRAY
        },
        margin: { left: 20, right: 20 }
    });

    // 4. Totals
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);

    const subtotal = quoteData.subtotal || quoteData.price || 0;
    const vat = quoteData.vat_amount || (subtotal * 0.23);
    const total = quoteData.total || (Number(subtotal) + Number(vat));

    doc.text(`Subtotal:`, 140, finalY);
    doc.text(`€${Number(subtotal).toFixed(2)}`, 190, finalY, { align: "right" });

    doc.text(`VAT (23%):`, 140, finalY + 7);
    doc.text(`€${Number(vat).toFixed(2)}`, 190, finalY + 7, { align: "right" });

    doc.setDrawColor(200, 200, 200);
    doc.line(130, finalY + 10, 190, finalY + 10);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.text(`TOTAL:`, 140, finalY + 18);
    doc.text(`€${Number(total).toFixed(2)}`, 190, finalY + 18, { align: "right" });

    // 5. Terms & Signature
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.text("Terms:", 20, finalY + 35);
    doc.setFont("helvetica", "normal");
    doc.text("Payment terms must be injected payment and customer conditions and resolution concluded", 20, finalY + 40);
    doc.text("before and determines insurance within the corridor for the lease of time.", 20, finalY + 44);
    doc.setFont("helvetica", "bold");
    doc.text("This quotation is valid for 30 days.", 20, finalY + 52);

    // 6. Footer bar
    const pageHeight = doc.internal.pageSize.height;
    doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.rect(0, pageHeight - 25, 210, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("www.transport.com      @swifttransport      @swifttransport", 105, pageHeight - 12, { align: "center" });
    doc.setFontSize(11);
    doc.text("Thank you for choosing Swift Transport & Solutions", 105, pageHeight - 5, { align: "center" });

    // Download
    doc.save(`Quote_${quoteData.quote_number || 'Draft'}.pdf`);
};
