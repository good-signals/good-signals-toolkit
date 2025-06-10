import { supabase } from '@/integrations/supabase/client';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface EnhancedExportData {
  assessment: SiteAssessment & {
    siteVisitSectionImage?: string | null;
  };
  targetMetricSet: {
    id?: string;
    name?: string;
    user_custom_metrics_settings?: any[];
  } | null;
  detailedMetricScores: Map<string, any>;
  overallSiteSignalScore: number | null;
  completionPercentage: number | null;
}

export interface EnhancedExportOptions {
  includeImages?: boolean;
  pageOrientation?: 'portrait' | 'landscape';
  imageQuality?: 'high' | 'medium' | 'low';
}

// Category order for pages 3-9
const CATEGORY_PAGE_ORDER = [
  'Traffic',
  'Trade Area',
  'Market Coverage & Saturation',
  'Visitor Profile',
  'Demand & Spending',
  'Expense',
  'Financial Performance'
];

export const exportEnhancedSiteAssessmentToPDF = async (
  exportData: EnhancedExportData, 
  options: EnhancedExportOptions = {}
) => {
  let pdf: jsPDF | null = null;
  
  try {
    console.log('Starting enhanced PDF export for assessment:', exportData.assessment?.id);
    
    // Validate required data
    if (!exportData.assessment) {
      throw new Error('Assessment data is required for PDF export');
    }

    // Initialize PDF for 8.5x11 paper
    try {
      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: [8.5, 11]
      });
    } catch (error) {
      console.error('Failed to initialize PDF:', error);
      throw new Error('Failed to initialize PDF document');
    }

    const pageWidth = 8.5;
    const pageHeight = 11;
    const margin = 0.75;
    const contentWidth = pageWidth - (margin * 2);

    // Enhanced color scheme - changed primary blue to black
    const colors = {
      primary: { r: 0, g: 0, b: 0 }, // Changed from blue to black
      primaryLight: { r: 147, g: 197, b: 253 },
      success: { r: 34, g: 197, b: 94 },
      warning: { r: 234, g: 179, b: 8 },
      danger: { r: 239, g: 68, b: 68 },
      gray: { r: 107, g: 114, b: 128 },
      lightGray: { r: 248, g: 250, b: 252 },
      borderGray: { r: 226, g: 232, b: 240 },
      darkText: { r: 15, g: 23, b: 42 },
      mediumText: { r: 51, g: 65, b: 85 },
      lightText: { r: 71, g: 85, b: 105 }
    };

    // Helper functions
    const safeSetFillColor = (color: { r: number; g: number; b: number }) => {
      try {
        pdf!.setFillColor(color.r, color.g, color.b);
      } catch (error) {
        console.warn('Failed to set fill color:', error);
        pdf!.setFillColor(200, 200, 200);
      }
    };

    const safeSetTextColor = (color: { r: number; g: number; b: number }) => {
      try {
        pdf!.setTextColor(color.r, color.g, color.b);
      } catch (error) {
        console.warn('Failed to set text color:', error);
        pdf!.setTextColor(0, 0, 0);
      }
    };

    const loadImageWithTimeout = (src: string, timeoutMs: number = 3000): Promise<HTMLImageElement | null> => {
      return new Promise((resolve) => {
        if (!src || typeof src !== 'string') {
          resolve(null);
          return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        const timeoutId = setTimeout(() => {
          img.onload = null;
          img.onerror = null;
          resolve(null);
        }, timeoutMs);
        
        img.onload = () => {
          clearTimeout(timeoutId);
          if (img.width > 0 && img.height > 0) {
            resolve(img);
          } else {
            resolve(null);
          }
        };
        
        img.onerror = () => {
          clearTimeout(timeoutId);
          resolve(null);
        };
        
        try {
          img.src = src;
        } catch (error) {
          clearTimeout(timeoutId);
          resolve(null);
        }
      });
    };

    const generateMapImage = async (latitude: number, longitude: number): Promise<string | null> => {
      try {
        console.log('Generating map image for coordinates:', { latitude, longitude });
        
        const { data, error } = await supabase.functions.invoke('generate-map-image', {
          body: {
            latitude,
            longitude,
            zoom: 15,
            size: '600x300'
          }
        });

        if (error) {
          console.error('Error generating map image:', error);
          return null;
        }

        return data?.imageUrl || null;
      } catch (error) {
        console.error('Failed to generate map image:', error);
        return null;
      }
    };

    const addLogo = async () => {
      try {
        // Updated logo URL and made it half the size
        const logoUrl = '/lovable-uploads/23f531e5-c2b3-4541-923d-0fb6f1ead625.png';
        const img = await loadImageWithTimeout(logoUrl, 2000);
        
        if (!img) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) return;
        
        // Reduced logo height to half (from 0.5 to 0.25)
        const logoHeight = 0.25;
        const aspectRatio = img.width / img.height;
        const logoWidth = logoHeight * aspectRatio;
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imgData = canvas.toDataURL('image/png', 1.0);
        const logoX = pageWidth - margin - logoWidth;
        const logoY = margin;
        
        pdf!.addImage(imgData, 'PNG', logoX, logoY, logoWidth, logoHeight);
      } catch (error) {
        console.warn('Failed to add logo:', error);
      }
    };

    const addPageHeader = (title: string) => {
      try {
        pdf!.setFontSize(10);
        pdf!.setFont('helvetica', 'normal');
        safeSetTextColor(colors.gray);
        pdf!.text(title, margin, margin - 0.1);
      } catch (error) {
        console.warn('Failed to add page header:', error);
      }
    };

    const addImageToPage = async (imageUrl: string, yPos: number, maxHeight: number = 3.0) => {
      try {
        if (!options.includeImages) return yPos;

        const img = await loadImageWithTimeout(imageUrl, 3000);
        if (!img) return yPos;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return yPos;
        
        const aspectRatio = img.width / img.height;
        let imgWidth = contentWidth * 0.8;
        let imgHeight = imgWidth / aspectRatio;
        
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = imgHeight * aspectRatio;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        const xPos = margin + (contentWidth - imgWidth) / 2;
        
        pdf!.addImage(imgData, 'JPEG', xPos, yPos, imgWidth, imgHeight);
        return yPos + imgHeight + 0.3;
      } catch (error) {
        console.warn('Failed to add image:', error);
        return yPos;
      }
    };

    // PAGE 1: Title, address, site status, target metric set, overall site signal score, assessment completion and site location
    await addLogo();
    // Removed duplicate page header as requested
    let yPosition = margin;
    
    // Main title - aligned with logo top
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    safeSetTextColor(colors.primary);
    pdf.text('Site Assessment Report', margin, yPosition);
    yPosition += 0.8;
    
    // Assessment name
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    safeSetTextColor(colors.darkText);
    const assessmentName = exportData.assessment.assessment_name || 'Unnamed Assessment';
    pdf.text(assessmentName, margin, yPosition);
    yPosition += 0.6;
    
    // Address
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    safeSetTextColor(colors.darkText);
    pdf.text('Address:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    safeSetTextColor(colors.mediumText);
    const address = [
      exportData.assessment.address_line1,
      exportData.assessment.address_line2,
      exportData.assessment.city,
      exportData.assessment.state_province,
      exportData.assessment.postal_code
    ].filter(Boolean).join(', ') || 'Address not specified';
    const addressLines = pdf.splitTextToSize(address, contentWidth - 1.5);
    let addressY = yPosition;
    for (const line of addressLines) {
      pdf.text(line, margin + 1.0, addressY);
      addressY += 0.2;
    }
    yPosition = addressY + 0.3;
    
    // Site Status - equal spacing
    pdf.setFont('helvetica', 'bold');
    safeSetTextColor(colors.darkText);
    pdf.text('Site Status:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    safeSetTextColor(colors.mediumText);
    pdf.text(exportData.assessment.site_status || 'Prospect', margin + 1.0, yPosition);
    yPosition += 0.3;
    
    // Target Metric Set - equal spacing with actual name
    pdf.setFont('helvetica', 'bold');
    safeSetTextColor(colors.darkText);
    pdf.text('Target Metric Set:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    safeSetTextColor(colors.mediumText);
    const targetMetricSetName = exportData.targetMetricSet?.name || 'Not specified';
    pdf.text(targetMetricSetName, margin + 1.5, yPosition);
    yPosition += 0.6;
    
    // Two-column layout for scores
    const leftColumnX = margin;
    const rightColumnX = margin + (contentWidth / 2) + 0.5;
    const scoreStartY = yPosition;
    
    // Overall Site Signal Score (Left column)
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    safeSetTextColor(colors.primary);
    pdf.text('Overall Site Signal Score', leftColumnX, yPosition);
    yPosition += 0.4; // Added space between label and number
    
    pdf.setFontSize(36);
    const scoreText = exportData.overallSiteSignalScore !== null 
      ? `${exportData.overallSiteSignalScore.toFixed(0)}%` 
      : 'N/A';
    pdf.text(scoreText, leftColumnX, yPosition);
    
    // Assessment Completion (Right column)
    let rightYPosition = scoreStartY;
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    safeSetTextColor(colors.primary);
    pdf.text('Assessment Completion', rightColumnX, rightYPosition);
    rightYPosition += 0.4; // Added space between label and number
    
    pdf.setFontSize(36);
    const completionText = exportData.completionPercentage !== null 
      ? `${exportData.completionPercentage.toFixed(1)}%` 
      : '0%';
    pdf.text(completionText, rightColumnX, rightYPosition);
    
    // Move yPosition to below both columns
    yPosition += 1.2;
    
    // Site Location Map
    if (exportData.assessment.latitude && exportData.assessment.longitude) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      safeSetTextColor(colors.primary);
      pdf.text('Site Location', margin, yPosition);
      yPosition += 0.4;
      
      // Removed coordinates text as requested
      
      // Try to add map image - made it larger
      try {
        const mapImageUrl = await generateMapImage(
          exportData.assessment.latitude, 
          exportData.assessment.longitude
        );
        
        if (mapImageUrl && options.includeImages !== false) {
          yPosition = await addImageToPage(mapImageUrl, yPosition, 3.5); // Increased from 2.0 to 3.5
        } else {
          // If map fails, add a placeholder text
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'italic');
          safeSetTextColor(colors.gray);
          pdf.text('Map image unavailable', margin, yPosition);
          yPosition += 0.3;
        }
      } catch (error) {
        console.warn('Failed to add map to first page:', error);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        safeSetTextColor(colors.gray);
        pdf.text('Map image unavailable', margin, yPosition);
        yPosition += 0.3;
      }
    }

    // PAGE 2: Executive Summary (or map if it didn't fit on page 1)
    if (exportData.assessment.executive_summary) {
      pdf.addPage();
      await addLogo();
      yPosition = margin; // Align with logo top
      
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      safeSetTextColor(colors.primary);
      pdf.text('Executive Summary', margin, yPosition);
      yPosition += 0.5;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      safeSetTextColor(colors.darkText);
      
      const summaryLines = pdf.splitTextToSize(exportData.assessment.executive_summary, contentWidth);
      for (const line of summaryLines) {
        if (yPosition > pageHeight - margin - 0.5) {
          pdf.addPage();
          await addLogo();
          yPosition = margin; // Align with logo top
        }
        pdf.text(line, margin, yPosition);
        yPosition += 0.2;
      }
    }

    // PAGES 3-9: Category-specific pages with metrics and images
    for (const categoryName of CATEGORY_PAGE_ORDER) {
      const categoryMetrics = Array.from(exportData.detailedMetricScores.entries())
        .filter(([_, data]) => data.category === categoryName);
      
      // Skip Visitor Profile if no data
      if (categoryName === 'Visitor Profile' && categoryMetrics.length === 0) {
        continue;
      }
      
      // Skip category if no metrics
      if (categoryMetrics.length === 0) {
        continue;
      }
      
      pdf.addPage();
      await addLogo();
      yPosition = margin; // Align with logo top
      
      // Category title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      safeSetTextColor(colors.primary);
      pdf.text(categoryName, margin, yPosition);
      yPosition += 0.5;
      
      // Category images first
      for (const [_, metricData] of categoryMetrics) {
        if (metricData.imageUrl && options.includeImages !== false) {
          yPosition = await addImageToPage(metricData.imageUrl, yPosition, 2.5);
          if (yPosition > pageHeight - margin - 2.0) {
            pdf.addPage();
            await addLogo();
            yPosition = margin; // Align with logo top
          }
        }
      }
      
      // Metrics table
      if (categoryMetrics.length > 0) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        safeSetTextColor(colors.darkText);
        pdf.text('Metrics', margin, yPosition);
        yPosition += 0.3;
        
        // Table headers
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        safeSetTextColor(colors.primary);
        pdf.text('Metric', margin, yPosition);
        pdf.text('Value', margin + 2.5, yPosition);
        pdf.text('Target', margin + 4.0, yPosition);
        pdf.text('Notes', margin + 5.5, yPosition);
        yPosition += 0.25;
        
        // Table rows
        pdf.setFont('helvetica', 'normal');
        safeSetTextColor(colors.darkText);
        
        for (const [_, metricData] of categoryMetrics) {
          if (yPosition > pageHeight - margin - 0.5) {
            pdf.addPage();
            await addLogo();
            yPosition = margin; // Align with logo top
          }
          
          const metricName = pdf.splitTextToSize(metricData.label || 'Unknown', 2.0);
          pdf.text(metricName[0] || 'Unknown', margin, yPosition);
          pdf.text(String(metricData.enteredValue ?? 'N/A'), margin + 2.5, yPosition);
          pdf.text(String(metricData.targetValue ?? 'N/A'), margin + 4.0, yPosition);
          
          if (metricData.notes) {
            const notesText = pdf.splitTextToSize(metricData.notes, 1.5);
            pdf.text(notesText[0] || '', margin + 5.5, yPosition);
          }
          
          yPosition += 0.2;
        }
      }
    }

    // PAGE 10: Site Visit Ratings
    if (exportData.assessment.site_visit_ratings && exportData.assessment.site_visit_ratings.length > 0) {
      pdf.addPage();
      await addLogo();
      yPosition = margin; // Align with logo top
      
      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      safeSetTextColor(colors.primary);
      pdf.text('Site Visit Ratings', margin, yPosition);
      yPosition += 0.5;
      
      // Site visit image
      if (exportData.assessment.siteVisitSectionImage && options.includeImages !== false) {
        yPosition = await addImageToPage(exportData.assessment.siteVisitSectionImage, yPosition, 2.5);
      }
      
      // Ratings table
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      safeSetTextColor(colors.primary);
      pdf.text('Criterion', margin, yPosition);
      pdf.text('Grade', margin + 2.0, yPosition);
      pdf.text('Description', margin + 3.0, yPosition);
      yPosition += 0.25;
      
      pdf.setFont('helvetica', 'normal');
      safeSetTextColor(colors.darkText);
      
      for (const rating of exportData.assessment.site_visit_ratings) {
        if (yPosition > pageHeight - margin - 0.5) {
          pdf.addPage();
          await addLogo();
          yPosition = margin; // Align with logo top
        }
        
        const criterionText = pdf.splitTextToSize(rating.criterion_key || 'Unknown', 1.8);
        pdf.text(criterionText[0] || 'Unknown', margin, yPosition);
        pdf.text(rating.rating_grade || 'N/A', margin + 2.0, yPosition);
        
        const descText = pdf.splitTextToSize(rating.rating_description || 'No description', 3.5);
        pdf.text(descText[0] || 'No description', margin + 3.0, yPosition);
        
        yPosition += 0.2;
      }
    }

    // Add footers to all pages
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      safeSetTextColor(colors.gray);
      
      const footerText = `Generated by Good Signals | ${new Date().toLocaleDateString()}`;
      pdf.text(footerText, margin, pageHeight - 0.3);
      
      const pageText = `Page ${i} of ${totalPages}`;
      const pageTextWidth = pdf.getTextWidth(pageText);
      pdf.text(pageText, pageWidth - margin - pageTextWidth, pageHeight - 0.3);
    }

    // Save the PDF
    const fileNameAssessmentName = exportData.assessment.assessment_name || 'assessment';
    const sanitizedName = fileNameAssessmentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `site_assessment_${sanitizedName}_${new Date().getTime()}.pdf`;

    pdf.save(fileName);
    
    console.log('Enhanced PDF export completed successfully:', fileName);
    return { success: true, fileName };
    
  } catch (error) {
    console.error('Error exporting enhanced assessment to PDF:', error);
    
    if (pdf) {
      try {
        pdf = null;
      } catch (cleanupError) {
        console.warn('Failed to cleanup PDF object:', cleanupError);
      }
    }
    
    throw new Error(`PDF Export Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
