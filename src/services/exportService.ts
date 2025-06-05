
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
    console.log('Starting enhanced PDF export for assessment:', exportData.assessment?.id);
    
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
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    const cardPadding = 12;
    const sectionSpacing = 15;

    // Enhanced color scheme matching web app
    const colors = {
      primary: [59, 130, 246], // Blue
      primaryLight: [147, 197, 253],
      success: [34, 197, 94], // Green
      warning: [234, 179, 8], // Yellow
      danger: [239, 68, 68], // Red
      gray: [107, 114, 128],
      lightGray: [248, 250, 252],
      borderGray: [226, 232, 240],
      darkText: [15, 23, 42],
      mediumText: [51, 65, 85],
      lightText: [71, 85, 105]
    };

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
              
              const logoHeight = 10;
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

    // Enhanced card styling function
    const addCard = (x: number, y: number, width: number, height: number, cardType: 'default' | 'header' | 'metric' | 'rating' = 'default') => {
      // Drop shadow effect
      pdf.setFillColor(0, 0, 0);
      pdf.setGlobalAlpha(0.1);
      pdf.roundedRect(x + 1, y + 1, width, height, 4, 4, 'F');
      pdf.setGlobalAlpha(1);
      
      // Main card background
      switch (cardType) {
        case 'header':
          pdf.setFillColor(...colors.primaryLight);
          break;
        case 'metric':
          pdf.setFillColor(255, 255, 255);
          break;
        default:
          pdf.setFillColor(...colors.lightGray);
      }
      pdf.roundedRect(x, y, width, height, 4, 4, 'F');
      
      // Card border
      pdf.setDrawColor(...colors.borderGray);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(x, y, width, height, 4, 4, 'S');
    };

    // Enhanced section header with better styling
    const addSectionHeader = (title: string, yPos: number, icon?: string) => {
      const headerHeight = 18;
      addCard(margin, yPos, contentWidth, headerHeight, 'header');
      
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...colors.primary);
      
      const headerText = icon ? `${icon} ${title}` : title;
      pdf.text(headerText, margin + cardPadding, yPos + 12);
      
      return yPos + headerHeight + sectionSpacing;
    };

    // Enhanced page header function
    const addPageHeader = (title: string) => {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...colors.gray);
      pdf.text(title, margin, margin - 5);
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
      
      return metricKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    // Enhanced metric table layout
    const addMetricTable = (metricsData: any[], yPos: number, categoryTitle: string) => {
      const tableHeaderHeight = 12;
      const rowHeight = 16;
      const totalTableHeight = tableHeaderHeight + (metricsData.length * rowHeight) + 8;
      
      // Table container card
      addCard(margin, yPos, contentWidth, totalTableHeight, 'metric');
      
      // Table header
      pdf.setFillColor(...colors.primary);
      pdf.roundedRect(margin + 2, yPos + 2, contentWidth - 4, tableHeaderHeight, 2, 2, 'F');
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      
      const colWidths = [contentWidth * 0.4, contentWidth * 0.2, contentWidth * 0.2, contentWidth * 0.2];
      const headers = ['Metric', 'Value', 'Target', 'Score'];
      let headerX = margin + cardPadding;
      
      headers.forEach((header, index) => {
        pdf.text(header, headerX, yPos + 9);
        headerX += colWidths[index];
      });
      
      // Table rows
      let currentY = yPos + tableHeaderHeight + 6;
      
      metricsData.forEach((metric, index) => {
        // Alternating row colors
        if (index % 2 === 0) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(margin + 2, currentY - 3, contentWidth - 4, rowHeight - 2, 'F');
        }
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...colors.darkText);
        
        let cellX = margin + cardPadding;
        
        // Metric name
        const metricName = pdf.splitTextToSize(metric.label, colWidths[0] - 10);
        pdf.text(metricName[0], cellX, currentY + 3);
        cellX += colWidths[0];
        
        // Value
        pdf.text(String(metric.enteredValue), cellX, currentY + 3);
        cellX += colWidths[1];
        
        // Target
        pdf.text(String(metric.targetValue), cellX, currentY + 3);
        cellX += colWidths[2];
        
        // Score with color coding
        const score = metric.score;
        if (score !== null && score !== undefined) {
          if (score >= 80) {
            pdf.setTextColor(...colors.success);
          } else if (score >= 60) {
            pdf.setTextColor(...colors.warning);
          } else {
            pdf.setTextColor(...colors.danger);
          }
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${score.toFixed(0)}%`, cellX, currentY + 3);
        } else {
          pdf.setTextColor(...colors.gray);
          pdf.text('N/A', cellX, currentY + 3);
        }
        
        currentY += rowHeight;
      });
      
      return yPos + totalTableHeight + sectionSpacing;
    };

    // Enhanced site visit ratings display
    const addSiteVisitRatingsTable = (ratings: any[], yPos: number) => {
      if (!ratings || ratings.length === 0) {
        return yPos;
      }
      
      const tableHeaderHeight = 12;
      const rowHeight = 20;
      const totalTableHeight = tableHeaderHeight + (ratings.length * rowHeight) + 8;
      
      addCard(margin, yPos, contentWidth, totalTableHeight, 'metric');
      
      // Table header
      pdf.setFillColor(...colors.primary);
      pdf.roundedRect(margin + 2, yPos + 2, contentWidth - 4, tableHeaderHeight, 2, 2, 'F');
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      
      const colWidths = [contentWidth * 0.4, contentWidth * 0.15, contentWidth * 0.45];
      const headers = ['Criterion', 'Grade', 'Description'];
      let headerX = margin + cardPadding;
      
      headers.forEach((header, index) => {
        pdf.text(header, headerX, yPos + 9);
        headerX += colWidths[index];
      });
      
      // Table rows
      let currentY = yPos + tableHeaderHeight + 6;
      
      ratings.forEach((rating, index) => {
        if (index % 2 === 0) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(margin + 2, currentY - 3, contentWidth - 4, rowHeight - 2, 'F');
        }
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...colors.darkText);
        
        let cellX = margin + cardPadding;
        
        // Criterion
        const criterionText = pdf.splitTextToSize(rating.label || rating.criterion_key, colWidths[0] - 10);
        pdf.text(criterionText[0], cellX, currentY + 3);
        cellX += colWidths[0];
        
        // Grade with badge styling
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...colors.primary);
        pdf.text(`Grade ${rating.rating_grade}`, cellX, currentY + 3);
        cellX += colWidths[1];
        
        // Description
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...colors.lightText);
        const descriptionText = pdf.splitTextToSize(rating.rating_description || 'No description', colWidths[2] - 10);
        pdf.text(descriptionText[0], cellX, currentY + 3);
        
        // Notes if available
        if (rating.notes) {
          pdf.setFontSize(9);
          pdf.setTextColor(...colors.gray);
          const notesText = pdf.splitTextToSize(`Notes: ${rating.notes}`, contentWidth - (cardPadding * 2));
          pdf.text(notesText[0], margin + cardPadding, currentY + 12);
        }
        
        currentY += rowHeight;
      });
      
      return yPos + totalTableHeight + sectionSpacing;
    };

    // Helper function to add enhanced image
    const addImageToPage = async (imageUrl: string, yPos: number, maxHeight: number = 80) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        return new Promise<number>((resolve) => {
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const aspectRatio = img.width / img.height;
            let imgWidth = contentWidth * 0.8;
            let imgHeight = imgWidth / aspectRatio;
            
            if (imgHeight > maxHeight) {
              imgHeight = maxHeight;
              imgWidth = imgHeight * aspectRatio;
            }
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            
            // Image container with border
            const imageCardHeight = imgHeight + 16;
            addCard(margin, yPos, contentWidth, imageCardHeight, 'metric');
            
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const xPos = margin + (contentWidth - imgWidth) / 2;
            
            pdf.addImage(imgData, 'JPEG', xPos, yPos + 8, imgWidth, imgHeight);
            resolve(yPos + imageCardHeight + sectionSpacing);
          };
          
          img.onerror = () => resolve(yPos);
          img.src = imageUrl;
        });
      } catch (error) {
        console.warn('Failed to add image to PDF:', error);
        return yPos;
      }
    };

    // Start building the PDF
    let currentPage = 1;
    await addLogo();
    
    // PAGE 1: Title and Assessment Overview
    addPageHeader('Site Assessment Report');
    let yPosition = margin + 25;
    
    // Main title
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...colors.primary);
    pdf.text('Site Assessment Report', margin, yPosition);
    yPosition += 25;
    
    // Assessment overview section
    yPosition = addSectionHeader('Assessment Overview', yPosition, '📋');
    
    const overviewHeight = 60;
    addCard(margin, yPosition, contentWidth, overviewHeight, 'metric');
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...colors.darkText);
    
    const assessmentName = exportData.assessment.assessment_name || 'Unnamed Assessment';
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

    // Overview content in a clean layout
    pdf.text('Assessment Name:', margin + cardPadding, yPosition + 15);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...colors.mediumText);
    pdf.text(assessmentName, margin + cardPadding + 50, yPosition + 15);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...colors.darkText);
    pdf.text('Address:', margin + cardPadding, yPosition + 25);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...colors.mediumText);
    const addressLines = pdf.splitTextToSize(address, contentWidth - 80);
    let addressY = yPosition + 25;
    addressLines.forEach((line: string) => {
      pdf.text(line, margin + cardPadding + 50, addressY);
      addressY += 6;
    });
    
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...colors.darkText);
    pdf.text('Created Date:', margin + cardPadding, yPosition + 45);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...colors.mediumText);
    pdf.text(createdDate, margin + cardPadding + 50, yPosition + 45);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...colors.darkText);
    pdf.text('Target Metric Set:', margin + cardPadding, yPosition + 55);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...colors.mediumText);
    pdf.text(exportData.targetMetricSet?.name || 'Not specified', margin + cardPadding + 50, yPosition + 55);
    
    yPosition += overviewHeight + sectionSpacing;

    // Overall Performance section
    yPosition = addSectionHeader('Overall Performance', yPosition, '📊');
    
    const performanceHeight = 45;
    addCard(margin, yPosition, contentWidth, performanceHeight, 'metric');
    
    const overallScore = exportData.overallSiteSignalScore !== null 
      ? exportData.overallSiteSignalScore.toFixed(0) + '%' 
      : 'Not calculated';
    const completionRate = exportData.completionPercentage !== null 
      ? exportData.completionPercentage.toFixed(1) + '%' 
      : 'Unknown';
    
    // Large score display
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...colors.primary);
    pdf.text(`Site Signal Score: ${overallScore}`, margin + cardPadding, yPosition + 20);
    
    pdf.setFontSize(16);
    pdf.setTextColor(...colors.mediumText);
    pdf.text(`Assessment Completion: ${completionRate}`, margin + cardPadding, yPosition + 35);

    // PAGE 2+: Metric Categories
    if (exportData.detailedMetricScores && exportData.detailedMetricScores.size > 0) {
      const metricsByCategory = new Map<string, Array<{ key: string; data: any }>>();
      
      for (const [key, data] of exportData.detailedMetricScores.entries()) {
        const category = data.category || 'Uncategorized';
        if (!metricsByCategory.has(category)) {
          metricsByCategory.set(category, []);
        }
        metricsByCategory.get(category)!.push({ key, data });
      }

      for (const [category, metrics] of metricsByCategory.entries()) {
        pdf.addPage();
        currentPage++;
        await addLogo();
        addPageHeader(`${category} Metrics`);
        yPosition = margin + 25;
        
        yPosition = addSectionHeader(category, yPosition, '🏷️');
        
        // Category image if available
        const categoryImage = metrics.find(m => m.data.imageUrl)?.data.imageUrl;
        if (categoryImage && options.includeImages) {
          yPosition = await addImageToPage(categoryImage, yPosition, 60);
        }
        
        // Convert metrics to table format
        const metricsTableData = metrics.map(({ key, data }) => ({
          label: getMetricDisplayLabel(key, exportData.targetMetricSet),
          enteredValue: data.enteredValue ?? 'N/A',
          targetValue: data.targetValue ?? 'N/A',
          score: data.score
        }));
        
        yPosition = addMetricTable(metricsTableData, yPosition, category);
      }
    }

    // Site Visit Ratings Page
    if (exportData.assessment.site_visit_ratings && exportData.assessment.site_visit_ratings.length > 0) {
      pdf.addPage();
      currentPage++;
      await addLogo();
      addPageHeader('Site Visit Ratings');
      yPosition = margin + 25;
      
      yPosition = addSectionHeader('Site Visit Ratings', yPosition, '✅');
      
      // Site visit image if available
      const siteVisitImage = exportData.assessment.site_visit_ratings.find((r: any) => r.imageUrl)?.imageUrl;
      if (siteVisitImage && options.includeImages) {
        yPosition = await addImageToPage(siteVisitImage, yPosition, 60);
      }
      
      yPosition = addSiteVisitRatingsTable(exportData.assessment.site_visit_ratings, yPosition);
    }

    // Executive Summary Page
    if (exportData.assessment.executive_summary) {
      pdf.addPage();
      currentPage++;
      await addLogo();
      addPageHeader('Executive Summary');
      yPosition = margin + 25;
      
      yPosition = addSectionHeader('Executive Summary', yPosition, '📄');
      
      const summaryLines = pdf.splitTextToSize(exportData.assessment.executive_summary, contentWidth - (cardPadding * 2));
      const summaryHeight = Math.max(60, summaryLines.length * 6 + 20);
      
      addCard(margin, yPosition, contentWidth, summaryHeight, 'metric');
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...colors.darkText);
      
      let summaryY = yPosition + 15;
      summaryLines.forEach((line: string) => {
        pdf.text(line, margin + cardPadding, summaryY);
        summaryY += 6;
      });
    }

    // Add professional footer to all pages
    const now = new Date();
    const exportDate = now.toLocaleDateString();
    const exportTime = now.toLocaleTimeString();
    const totalPages = pdf.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...colors.gray);
      
      // Footer line
      pdf.setDrawColor(...colors.borderGray);
      pdf.setLineWidth(0.5);
      pdf.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
      
      const footerText = `Generated by Good Signals | ${exportDate} at ${exportTime}`;
      pdf.text(footerText, margin, pageHeight - 12);
      
      const pageText = `Page ${i} of ${totalPages}`;
      const pageTextWidth = pdf.getTextWidth(pageText);
      pdf.text(pageText, pageWidth - margin - pageTextWidth, pageHeight - 12);
    }

    // Generate filename and save
    const fileNameAssessmentName = exportData.assessment.assessment_name || 'assessment';
    const sanitizedName = fileNameAssessmentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `site_assessment_${sanitizedName}_${new Date().getTime()}.pdf`;

    pdf.save(fileName);
    
    console.log('Enhanced PDF export completed successfully:', fileName);
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
