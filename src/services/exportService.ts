
import { supabase } from '@/integrations/supabase/client';
import { CBSAData } from '@/types/territoryTargeterTypes';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { getAccountSignalThresholds } from './targetMetrics/accountHelpers';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Fix ExportData interface to match component usage
export interface ExportData {
  assessment: any; // SiteAssessment type
  targetMetricSet: {
    id?: string;
    account_id?: string;
    name?: string;
    created_at?: string;
    updated_at?: string;
    user_custom_metrics_settings?: any[];
  } | null;
  accountSettings: any; // Account type
  detailedMetricScores: Map<string, any>;
  overallSiteSignalScore: number | null;
  completionPercentage: number | null;
}

export interface ExportOptions {
  format?: 'csv' | 'pdf';
  includeImages?: boolean;
  pageOrientation?: 'portrait' | 'landscape';
  imageQuality?: 'high' | 'medium' | 'low';
}

export const exportCBSADataToCSV = async (
  data: CBSAData[],
  fileName: string = 'cbsa_analysis_results',
  account: any = null
) => {
  const { goodThreshold, badThreshold } = getAccountSignalThresholds(account);

  const csvRows = [];

  // Headers
  const headers = Object.keys(data[0] || {}).filter(key => key !== 'geometry');
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      let value = row[header as keyof CBSAData];

      if (header === 'site_signal_score') {
        if (value === null || value === undefined) {
          return 'No Data';
        }
        if (typeof value === 'number') {
          if (value >= goodThreshold) {
            return 'Good';
          } else if (value <= badThreshold) {
            return 'Bad';
          } else {
            return 'Neutral';
          }
        }
      }

      if (typeof value === 'string') {
        value = value.replace(/"/g, '""');
        return `"${value}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }

  const csvData = csvRows.join('\n');
  const blob = new Blob([csvData], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', 'true');
  a.setAttribute('href', url);
  a.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export const exportSiteAssessmentsToCSV = async (
  assessments: SiteAssessment[],
  fileName: string = 'site_assessments',
  account: any = null
) => {
  const { goodThreshold, badThreshold } = getAccountSignalThresholds(account);

  const csvRows = [];

  // Headers
  const headers = [
    "Assessment Name", "Address", "City", "State", "Zip Code", "Created At",
    "Site Signal Score", "Completion Percentage", "Site Status"
  ];
  csvRows.push(headers.join(','));

  for (const assessment of assessments) {
    const values = [
      `"${assessment.assessment_name?.replace(/"/g, '""') || ''}"`,
      `"${assessment.address_line1?.replace(/"/g, '""') || ''}"`,
      `"${assessment.city?.replace(/"/g, '""') || ''}"`,
      `"${assessment.state_province?.replace(/"/g, '""') || ''}"`,
      `"${assessment.postal_code?.replace(/"/g, '""') || ''}"`,
      `"${new Date(assessment.created_at).toLocaleDateString()}"`,
      (() => {
        if (assessment.site_signal_score === null || assessment.site_signal_score === undefined) {
          return 'No Data';
        }
        if (assessment.site_signal_score >= goodThreshold) {
          return 'Good';
        } else if (assessment.site_signal_score <= badThreshold) {
          return 'Bad';
        } else {
          return 'Neutral';
        }
      })(),
      `"${assessment.completion_percentage || 0}"`,
      `"${assessment.site_status?.replace(/"/g, '""') || ''}"`
    ];
    csvRows.push(values.join(','));
  }

  const csvData = csvRows.join('\n');
  const blob = new Blob([csvData], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', 'true');
  a.setAttribute('href', url);
  a.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export const exportAssessmentToPDF = async (exportData: ExportData, options: ExportOptions = { format: 'pdf' }) => {
  try {
    console.log('Starting PDF export for assessment:', exportData.assessment?.id);
    
    // Validate required data
    if (!exportData.assessment) {
      throw new Error('Assessment data is required for PDF export');
    }

    // Initialize PDF with proper orientation
    const pdf = new jsPDF({
      orientation: options.pageOrientation || 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    const cardPadding = 10;
    const sectionSpacing = 8;

    // Helper function to add the GoodSignals logo
    const addLogo = async () => {
      try {
        const logoUrl = '/lovable-uploads/73c12031-858d-406a-a679-3b7259c7649d.png';
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        return new Promise<void>((resolve) => {
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              const logoHeight = 8; // 8mm height
              const aspectRatio = img.width / img.height;
              const logoWidth = logoHeight * aspectRatio;
              
              canvas.width = img.width;
              canvas.height = img.height;
              ctx?.drawImage(img, 0, 0);
              
              const imgData = canvas.toDataURL('image/png', 1.0);
              const logoX = pageWidth - margin - logoWidth;
              const logoY = margin;
              
              pdf.addImage(imgData, 'PNG', logoX, logoY, logoWidth, logoHeight);
              resolve();
            } catch (error) {
              console.warn('Failed to add logo to PDF:', error);
              resolve();
            }
          };
          
          img.onerror = () => {
            console.warn('Failed to load logo for PDF');
            resolve();
          };
          
          img.src = logoUrl;
        });
      } catch (error) {
        console.warn('Failed to add logo to PDF:', error);
      }
    };

    // Helper function to add a card-style border and background
    const addCard = (x: number, y: number, width: number, height: number) => {
      // Card background
      pdf.setFillColor(248, 250, 252); // Light gray background
      pdf.roundedRect(x, y, width, height, 3, 3, 'F');
      
      // Card border
      pdf.setDrawColor(226, 232, 240); // Light border
      pdf.setLineWidth(0.5);
      pdf.roundedRect(x, y, width, height, 3, 3, 'S');
    };

    // Helper function to add section header with styling matching the web app
    const addSectionHeader = (title: string, yPos: number, icon?: string) => {
      const headerHeight = 14;
      addCard(margin, yPos, contentWidth, headerHeight);
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(59, 130, 246); // Blue color matching web app
      
      const headerText = icon ? `${icon} ${title}` : title;
      pdf.text(headerText, margin + cardPadding, yPos + 9);
      
      return yPos + headerHeight + sectionSpacing;
    };

    // Helper function to get display label for metrics
    const getMetricDisplayLabel = (metricKey: string, targetMetricSet: any) => {
      if (targetMetricSet?.user_custom_metrics_settings) {
        const setting = targetMetricSet.user_custom_metrics_settings.find(
          (s: any) => s.metric_identifier === metricKey
        );
        if (setting?.label) {
          return setting.label;
        }
      }
      
      // Fallback to formatted version of the key
      return metricKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    // Helper function to add metric card matching web app styling
    const addMetricCard = (label: string, value: string, target: string, score: number | null, notes: string | null, yPos: number) => {
      const baseCardHeight = 22;
      const notesHeight = notes ? 8 : 0;
      const cardHeight = baseCardHeight + notesHeight;
      
      addCard(margin, yPos, contentWidth, cardHeight);
      
      // Metric label - larger and bold like web app
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(51, 65, 85); // Darker text for label
      pdf.text(label, margin + cardPadding, yPos + 8);
      
      // Value, Target, Score layout in a row like web app
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      // Value
      pdf.setTextColor(71, 85, 105);
      pdf.text('Value:', margin + cardPadding, yPos + 14);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.text(value, margin + cardPadding + 18, yPos + 14);
      
      // Target
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(71, 85, 105);
      pdf.text('Target:', margin + cardPadding + 60, yPos + 14);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.text(target, margin + cardPadding + 78, yPos + 14);
      
      // Score with color coding like web app
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(71, 85, 105);
      pdf.text('Score:', margin + cardPadding + 120, yPos + 14);
      
      const scoreText = score !== null ? `${score.toFixed(0)}%` : 'N/A';
      // Color code the score
      if (score !== null) {
        if (score >= 80) {
          pdf.setTextColor(34, 197, 94); // Green
        } else if (score >= 60) {
          pdf.setTextColor(234, 179, 8); // Yellow
        } else {
          pdf.setTextColor(239, 68, 68); // Red
        }
      } else {
        pdf.setTextColor(107, 114, 128); // Gray
      }
      pdf.setFont('helvetica', 'bold');
      pdf.text(scoreText, margin + cardPadding + 138, yPos + 14);
      
      // Notes if available
      if (notes) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        pdf.text('Notes:', margin + cardPadding, yPos + 20);
        const notesLines = pdf.splitTextToSize(notes, contentWidth - (cardPadding * 2) - 20);
        let notesY = yPos + 20;
        notesLines.forEach((line: string) => {
          pdf.text(line, margin + cardPadding + 20, notesY);
          notesY += 3;
        });
      }
      
      return yPos + cardHeight + 4;
    };

    // Helper function to add image to PDF
    const addImageToPage = async (imageUrl: string, yPos: number, maxHeight: number = 60) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        return new Promise<number>((resolve) => {
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate dimensions maintaining aspect ratio
            const aspectRatio = img.width / img.height;
            let imgWidth = contentWidth * 0.7; // 70% of content width
            let imgHeight = imgWidth / aspectRatio;
            
            if (imgHeight > maxHeight) {
              imgHeight = maxHeight;
              imgWidth = imgHeight * aspectRatio;
            }
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            
            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            const xPos = margin + (contentWidth - imgWidth) / 2; // Center the image
            
            pdf.addImage(imgData, 'JPEG', xPos, yPos, imgWidth, imgHeight);
            resolve(yPos + imgHeight + sectionSpacing);
          };
          
          img.onerror = () => {
            // If image fails to load, just continue without it
            resolve(yPos);
          };
          
          img.src = imageUrl;
        });
      } catch (error) {
        console.warn('Failed to add image to PDF:', error);
        return yPos;
      }
    };

    let currentPage = 1;
    
    // Add logo to first page
    await addLogo();
    
    // Page 1: Assessment Overview
    let yPosition = margin + 20; // Leave space for logo
    
    // Title
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('Site Assessment Report', margin, yPosition);
    yPosition += 20;
    
    // Assessment details card
    yPosition = addSectionHeader('Assessment Overview', yPosition, '📋');
    
    const overviewHeight = 40;
    addCard(margin, yPosition, contentWidth, overviewHeight);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    
    const overviewAssessmentName = exportData.assessment.assessment_name || 'Unnamed Assessment';
    const address = [
      exportData.assessment.address_line1,
      exportData.assessment.address_line2,
      exportData.assessment.city,
      exportData.assessment.state_province,
      exportData.assessment.postal_code
    ].filter(Boolean).join(', ') || 'Address not specified';
    
    const createdDate = exportData.assessment.created_at 
      ? new Date(exportData.assessment.created_at).toLocaleDateString()
      : 'Unknown';

    pdf.setFont('helvetica', 'bold');
    pdf.text('Name:', margin + cardPadding, yPosition + 8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(overviewAssessmentName, margin + cardPadding + 20, yPosition + 8);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Address:', margin + cardPadding, yPosition + 14);
    pdf.setFont('helvetica', 'normal');
    const addressLines = pdf.splitTextToSize(address, contentWidth - (cardPadding * 2) - 25);
    let addressY = yPosition + 14;
    addressLines.forEach((line: string) => {
      pdf.text(line, margin + cardPadding + 25, addressY);
      addressY += 4;
    });
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Created:', margin + cardPadding, yPosition + 26);
    pdf.setFont('helvetica', 'normal');
    pdf.text(createdDate, margin + cardPadding + 25, yPosition + 26);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Target Metric Set:', margin + cardPadding, yPosition + 32);
    pdf.setFont('helvetica', 'normal');
    pdf.text(exportData.targetMetricSet?.name || 'Not specified', margin + cardPadding + 45, yPosition + 32);
    
    yPosition += overviewHeight + sectionSpacing;
    
    // Overall scores card
    yPosition = addSectionHeader('Overall Performance', yPosition, '📊');
    
    const scoresHeight = 25;
    addCard(margin, yPosition, contentWidth, scoresHeight);
    
    const overallScore = exportData.overallSiteSignalScore !== null 
      ? `${exportData.overallSiteSignalScore.toFixed(0)}%` 
      : 'Not calculated';
    const completionRate = exportData.completionPercentage !== null 
      ? exportData.completionPercentage.toFixed(1) + '%' 
      : 'Unknown';
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text(`Site Signal Score: ${overallScore}`, margin + cardPadding, yPosition + 12);
    pdf.text(`Completion: ${completionRate}`, margin + cardPadding + 90, yPosition + 12);
    
    // Metric Categories - Each on its own page
    if (exportData.detailedMetricScores && exportData.detailedMetricScores.size > 0) {
      // Group metrics by category
      const metricsByCategory = new Map<string, Array<{ key: string; data: any }>>();
      
      for (const [key, data] of exportData.detailedMetricScores.entries()) {
        const category = data.category || 'Uncategorized';
        if (!metricsByCategory.has(category)) {
          metricsByCategory.set(category, []);
        }
        metricsByCategory.get(category)!.push({ key, data });
      }

      // Create a page for each category
      for (const [category, metrics] of metricsByCategory.entries()) {
        pdf.addPage();
        currentPage++;
        await addLogo(); // Add logo to each page
        yPosition = margin + 20; // Leave space for logo
        
        yPosition = addSectionHeader(category, yPosition, '🏷️');
        
        // Find category image if it exists
        const categoryImage = metrics.find(m => m.data.imageUrl)?.data.imageUrl;
        if (categoryImage && options.includeImages) {
          yPosition = await addImageToPage(categoryImage, yPosition, 50);
        }
        
        // Add metrics for this category
        for (const { key, data } of metrics) {
          if (yPosition > pageHeight - 50) {
            pdf.addPage();
            currentPage++;
            await addLogo();
            yPosition = margin + 20;
          }
          
          const label = getMetricDisplayLabel(key, exportData.targetMetricSet);
          const enteredValue = data.enteredValue ?? 'N/A';
          const targetValue = data.targetValue ?? 'N/A';
          const score = data.score;
          const notes = data.notes;
          
          yPosition = addMetricCard(label, String(enteredValue), String(targetValue), score, notes, yPosition);
        }
      }
    }

    // Site Visit Ratings - On its own page
    if (exportData.assessment.site_visit_ratings && exportData.assessment.site_visit_ratings.length > 0) {
      pdf.addPage();
      currentPage++;
      await addLogo();
      yPosition = margin + 20;
      
      yPosition = addSectionHeader('Site Visit Ratings', yPosition, '✅');
      
      // Find site visit image if it exists
      const siteVisitImage = exportData.assessment.site_visit_ratings.find((r: any) => r.imageUrl)?.imageUrl;
      if (siteVisitImage && options.includeImages) {
        yPosition = await addImageToPage(siteVisitImage, yPosition, 50);
      }
      
      exportData.assessment.site_visit_ratings.forEach((rating: any) => {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          currentPage++;
          await addLogo();
          yPosition = margin + 20;
        }
        
        const cardHeight = rating.notes ? 25 : 20;
        addCard(margin, yPosition, contentWidth, cardHeight);
        
        const label = rating.label || rating.criterion_key;
        const grade = rating.rating_grade;
        const description = rating.rating_description || 'No description';
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(51, 65, 85);
        pdf.text(`${label}`, margin + cardPadding, yPosition + 8);
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
        pdf.text('Rating:', margin + cardPadding, yPosition + 14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(59, 130, 246);
        pdf.text(`Grade ${grade}`, margin + cardPadding + 25, yPosition + 14);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 116, 139);
        pdf.text(description, margin + cardPadding + 60, yPosition + 14);
        
        if (rating.notes) {
          pdf.setFontSize(10);
          pdf.setTextColor(107, 114, 128);
          pdf.text('Notes:', margin + cardPadding, yPosition + 20);
          const notesLines = pdf.splitTextToSize(rating.notes, contentWidth - (cardPadding * 2) - 20);
          let notesY = yPosition + 20;
          notesLines.forEach((line: string) => {
            pdf.text(line, margin + cardPadding + 20, notesY);
            notesY += 3;
          });
        }
        
        yPosition += cardHeight + 4;
      });
    }

    // Executive Summary - On its own page
    if (exportData.assessment.executive_summary) {
      pdf.addPage();
      currentPage++;
      await addLogo();
      yPosition = margin + 20;
      
      yPosition = addSectionHeader('Executive Summary', yPosition, '📄');
      
      const summaryLines = pdf.splitTextToSize(exportData.assessment.executive_summary, contentWidth - (cardPadding * 2));
      const summaryHeight = Math.max(35, summaryLines.length * 5 + 15);
      
      addCard(margin, yPosition, contentWidth, summaryHeight);
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      
      let summaryY = yPosition + 8;
      summaryLines.forEach((line: string) => {
        pdf.text(line, margin + cardPadding, summaryY);
        summaryY += 5;
      });
    }

    // Add page numbers and export info to each page
    const now = new Date();
    const exportDate = now.toLocaleDateString();
    const exportTime = now.toLocaleTimeString();
    const totalPages = pdf.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(156, 163, 175);
      
      // Footer text
      const footerText = `Exported on ${exportDate} at ${exportTime} | Page ${i} of ${totalPages}`;
      const footerWidth = pdf.getTextWidth(footerText);
      const footerX = (pageWidth - footerWidth) / 2;
      
      pdf.text(footerText, footerX, pageHeight - 10);
    }

    // Generate filename
    const fileNameAssessmentName = exportData.assessment.assessment_name || 'assessment';
    const sanitizedName = fileNameAssessmentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `site_assessment_${sanitizedName}_${new Date().getTime()}.pdf`;

    // Save the PDF
    pdf.save(fileName);
    
    console.log('PDF export completed successfully:', fileName);
    return { success: true, fileName };
    
  } catch (error) {
    console.error('Error exporting assessment to PDF:', error);
    throw new Error(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const uploadCSV = async (file: File): Promise<{ data: any[]; error: Error | null }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const data: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const row: any = {};

          for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = values[j];
          }

          data.push(row);
        }

        resolve({ data, error: null });
      } catch (error: any) {
        console.error("Error parsing CSV:", error);
        reject({ data: [], error: new Error(error.message || "Failed to parse CSV data.") });
      }
    };

    reader.onerror = () => {
      reject({ data: [], error: new Error("Failed to read the CSV file.") });
    };

    reader.readAsText(file);
  });
};
