
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
  let pdf: jsPDF | null = null;
  
  try {
    console.log('Starting enhanced PDF export for assessment:', exportData.assessment?.id);
    
    // Validate required data
    if (!exportData.assessment) {
      throw new Error('Assessment data is required for PDF export');
    }

    // Validate assessment has minimum required fields
    if (!exportData.assessment.assessment_name && !exportData.assessment.address_line1) {
      throw new Error('Assessment must have either a name or address to export');
    }

    // Initialize PDF with proper orientation and error handling
    try {
      pdf = new jsPDF({
        orientation: options.pageOrientation || 'portrait',
        unit: 'mm',
        format: 'a4'
      });
    } catch (error) {
      console.error('Failed to initialize PDF:', error);
      throw new Error('Failed to initialize PDF document');
    }

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    const cardPadding = 12;
    const sectionSpacing = 15;

    // Enhanced color scheme - using individual parameters instead of spread
    const colors = {
      primary: { r: 59, g: 130, b: 246 },
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

    // Helper function to safely set fill color
    const safeSetFillColor = (color: { r: number; g: number; b: number }) => {
      try {
        pdf!.setFillColor(color.r, color.g, color.b);
      } catch (error) {
        console.warn('Failed to set fill color:', error);
        pdf!.setFillColor(200, 200, 200); // Fallback to gray
      }
    };

    // Helper function to safely set text color
    const safeSetTextColor = (color: { r: number; g: number; b: number }) => {
      try {
        pdf!.setTextColor(color.r, color.g, color.b);
      } catch (error) {
        console.warn('Failed to set text color:', error);
        pdf!.setTextColor(0, 0, 0); // Fallback to black
      }
    };

    // Helper function to safely set draw color
    const safeSetDrawColor = (color: { r: number; g: number; b: number }) => {
      try {
        pdf!.setDrawColor(color.r, color.g, color.b);
      } catch (error) {
        console.warn('Failed to set draw color:', error);
        pdf!.setDrawColor(0, 0, 0); // Fallback to black
      }
    };

    // Helper function to load image with timeout and better error handling
    const loadImageWithTimeout = (src: string, timeoutMs: number = 2000): Promise<HTMLImageElement | null> => {
      return new Promise((resolve) => {
        if (!src || typeof src !== 'string') {
          console.warn('Invalid image source:', src);
          resolve(null);
          return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        const timeoutId = setTimeout(() => {
          console.warn(`Image loading timed out after ${timeoutMs}ms for:`, src);
          img.onload = null;
          img.onerror = null;
          resolve(null);
        }, timeoutMs);
        
        img.onload = () => {
          clearTimeout(timeoutId);
          if (img.width > 0 && img.height > 0) {
            resolve(img);
          } else {
            console.warn('Image loaded but has invalid dimensions:', src);
            resolve(null);
          }
        };
        
        img.onerror = (error) => {
          clearTimeout(timeoutId);
          console.warn('Failed to load image:', src, error);
          resolve(null);
        };
        
        try {
          img.src = src;
        } catch (error) {
          clearTimeout(timeoutId);
          console.warn('Error setting image src:', src, error);
          resolve(null);
        }
      });
    };

    // Helper function to add the GoodSignals logo with timeout
    const addLogo = async () => {
      try {
        const logoUrl = '/lovable-uploads/73c12031-858d-406a-a679-3b7259c7649d.png';
        console.log('Attempting to load logo:', logoUrl);
        
        const img = await loadImageWithTimeout(logoUrl, 1500);
        
        if (!img) {
          console.warn('Logo failed to load, continuing without logo');
          return;
        }

        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            console.warn('Canvas context not available, skipping logo');
            return;
          }
          
          const logoHeight = 10;
          const aspectRatio = img.width / img.height;
          const logoWidth = logoHeight * aspectRatio;
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imgData = canvas.toDataURL('image/png', 1.0);
          const logoX = pageWidth - margin - logoWidth;
          const logoY = margin;
          
          pdf!.addImage(imgData, 'PNG', logoX, logoY, logoWidth, logoHeight);
          console.log('Logo added successfully');
        } catch (error) {
          console.warn('Failed to process logo image:', error);
        }
      } catch (error) {
        console.warn('Failed to add logo to PDF:', error);
      }
    };

    // Enhanced card styling function
    const addCard = (x: number, y: number, width: number, height: number, cardType: 'default' | 'header' | 'metric' | 'rating' = 'default') => {
      try {
        // Simple shadow effect using a slightly offset gray rectangle
        safeSetFillColor({ r: 0, g: 0, b: 0 });
        // Create shadow effect manually instead of using setGState
        pdf!.setFillColor(200, 200, 200); // Light gray for shadow
        pdf!.roundedRect(x + 1, y + 1, width, height, 4, 4, 'F');
        
        // Main card background
        switch (cardType) {
          case 'header':
            safeSetFillColor(colors.primaryLight);
            break;
          case 'metric':
            safeSetFillColor({ r: 255, g: 255, b: 255 });
            break;
          default:
            safeSetFillColor(colors.lightGray);
        }
        pdf!.roundedRect(x, y, width, height, 4, 4, 'F');
        
        // Card border
        safeSetDrawColor(colors.borderGray);
        pdf!.setLineWidth(0.5);
        pdf!.roundedRect(x, y, width, height, 4, 4, 'S');
      } catch (error) {
        console.warn('Failed to add card:', error);
        // Add simple rectangle as fallback
        try {
          safeSetFillColor({ r: 248, g: 250, b: 252 });
          pdf!.rect(x, y, width, height, 'F');
        } catch (fallbackError) {
          console.warn('Failed to add fallback card:', fallbackError);
        }
      }
    };

    // Enhanced section header with better styling
    const addSectionHeader = (title: string, yPos: number, icon?: string) => {
      try {
        const headerHeight = 18;
        addCard(margin, yPos, contentWidth, headerHeight, 'header');
        
        pdf!.setFontSize(18);
        pdf!.setFont('helvetica', 'bold');
        safeSetTextColor(colors.primary);
        
        const headerText = icon ? `${icon} ${title}` : title;
        pdf!.text(headerText, margin + cardPadding, yPos + 12);
        
        return yPos + headerHeight + sectionSpacing;
      } catch (error) {
        console.warn('Failed to add section header:', error);
        return yPos + 20; // Return some spacing even if header fails
      }
    };

    // Enhanced page header function
    const addPageHeader = (title: string) => {
      try {
        pdf!.setFontSize(12);
        pdf!.setFont('helvetica', 'normal');
        safeSetTextColor(colors.gray);
        pdf!.text(title, margin, margin - 5);
      } catch (error) {
        console.warn('Failed to add page header:', error);
      }
    };

    // Helper function to get display label for metrics
    const getMetricDisplayLabel = (metricKey: string, targetMetricSet: any) => {
      try {
        if (targetMetricSet?.user_custom_metrics_settings) {
          const setting = targetMetricSet.user_custom_metrics_settings.find(
            (s: any) => s.metric_identifier === metricKey
          );
          if (setting?.label) {
            return setting.label;
          }
        }
        
        return metricKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      } catch (error) {
        console.warn('Failed to get metric display label:', error);
        return metricKey || 'Unknown Metric';
      }
    };

    // Enhanced metric table layout
    const addMetricTable = (metricsData: any[], yPos: number, categoryTitle: string) => {
      try {
        if (!metricsData || metricsData.length === 0) {
          return yPos;
        }

        const tableHeaderHeight = 12;
        const rowHeight = 16;
        const totalTableHeight = tableHeaderHeight + (metricsData.length * rowHeight) + 8;
        
        // Table container card
        addCard(margin, yPos, contentWidth, totalTableHeight, 'metric');
        
        // Table header
        safeSetFillColor(colors.primary);
        pdf!.roundedRect(margin + 2, yPos + 2, contentWidth - 4, tableHeaderHeight, 2, 2, 'F');
        
        pdf!.setFontSize(11);
        pdf!.setFont('helvetica', 'bold');
        safeSetTextColor({ r: 255, g: 255, b: 255 });
        
        const colWidths = [contentWidth * 0.4, contentWidth * 0.2, contentWidth * 0.2, contentWidth * 0.2];
        const headers = ['Metric', 'Value', 'Target', 'Score'];
        let headerX = margin + cardPadding;
        
        headers.forEach((header, index) => {
          pdf!.text(header, headerX, yPos + 9);
          headerX += colWidths[index];
        });
        
        // Table rows
        let currentY = yPos + tableHeaderHeight + 6;
        
        metricsData.forEach((metric, index) => {
          try {
            // Alternating row colors
            if (index % 2 === 0) {
              safeSetFillColor({ r: 249, g: 250, b: 251 });
              pdf!.rect(margin + 2, currentY - 3, contentWidth - 4, rowHeight - 2, 'F');
            }
            
            pdf!.setFontSize(10);
            pdf!.setFont('helvetica', 'normal');
            safeSetTextColor(colors.darkText);
            
            let cellX = margin + cardPadding;
            
            // Metric name
            const metricName = pdf!.splitTextToSize(metric.label || 'Unknown', colWidths[0] - 10);
            pdf!.text(metricName[0] || 'Unknown', cellX, currentY + 3);
            cellX += colWidths[0];
            
            // Value
            pdf!.text(String(metric.enteredValue ?? 'N/A'), cellX, currentY + 3);
            cellX += colWidths[1];
            
            // Target
            pdf!.text(String(metric.targetValue ?? 'N/A'), cellX, currentY + 3);
            cellX += colWidths[2];
            
            // Score with color coding
            const score = metric.score;
            if (score !== null && score !== undefined && !isNaN(score)) {
              if (score >= 80) {
                safeSetTextColor(colors.success);
              } else if (score >= 60) {
                safeSetTextColor(colors.warning);
              } else {
                safeSetTextColor(colors.danger);
              }
              pdf!.setFont('helvetica', 'bold');
              pdf!.text(`${score.toFixed(0)}%`, cellX, currentY + 3);
            } else {
              safeSetTextColor(colors.gray);
              pdf!.text('N/A', cellX, currentY + 3);
            }
            
            currentY += rowHeight;
          } catch (rowError) {
            console.warn('Failed to add table row:', rowError);
            currentY += rowHeight; // Continue with next row
          }
        });
        
        return yPos + totalTableHeight + sectionSpacing;
      } catch (error) {
        console.warn('Failed to add metric table:', error);
        return yPos + 50; // Return some spacing even if table fails
      }
    };

    // Enhanced site visit ratings display
    const addSiteVisitRatingsTable = (ratings: any[], yPos: number) => {
      try {
        if (!ratings || ratings.length === 0) {
          return yPos;
        }
        
        const tableHeaderHeight = 12;
        const rowHeight = 20;
        const totalTableHeight = tableHeaderHeight + (ratings.length * rowHeight) + 8;
        
        addCard(margin, yPos, contentWidth, totalTableHeight, 'metric');
        
        // Table header
        safeSetFillColor(colors.primary);
        pdf!.roundedRect(margin + 2, yPos + 2, contentWidth - 4, tableHeaderHeight, 2, 2, 'F');
        
        pdf!.setFontSize(11);
        pdf!.setFont('helvetica', 'bold');
        safeSetTextColor({ r: 255, g: 255, b: 255 });
        
        const colWidths = [contentWidth * 0.4, contentWidth * 0.15, contentWidth * 0.45];
        const headers = ['Criterion', 'Grade', 'Description'];
        let headerX = margin + cardPadding;
        
        headers.forEach((header, index) => {
          pdf!.text(header, headerX, yPos + 9);
          headerX += colWidths[index];
        });
        
        // Table rows
        let currentY = yPos + tableHeaderHeight + 6;
        
        ratings.forEach((rating, index) => {
          try {
            if (index % 2 === 0) {
              safeSetFillColor({ r: 249, g: 250, b: 251 });
              pdf!.rect(margin + 2, currentY - 3, contentWidth - 4, rowHeight - 2, 'F');
            }
            
            pdf!.setFontSize(10);
            pdf!.setFont('helvetica', 'normal');
            safeSetTextColor(colors.darkText);
            
            let cellX = margin + cardPadding;
            
            // Criterion
            const criterionText = pdf!.splitTextToSize(rating.label || rating.criterion_key || 'Unknown', colWidths[0] - 10);
            pdf!.text(criterionText[0] || 'Unknown', cellX, currentY + 3);
            cellX += colWidths[0];
            
            // Grade with badge styling
            pdf!.setFont('helvetica', 'bold');
            safeSetTextColor(colors.primary);
            pdf!.text(`Grade ${rating.rating_grade || 'N/A'}`, cellX, currentY + 3);
            cellX += colWidths[1];
            
            // Description
            pdf!.setFont('helvetica', 'normal');
            safeSetTextColor(colors.lightText);
            const descriptionText = pdf!.splitTextToSize(rating.rating_description || 'No description', colWidths[2] - 10);
            pdf!.text(descriptionText[0] || 'No description', cellX, currentY + 3);
            
            // Notes if available
            if (rating.notes) {
              pdf!.setFontSize(9);
              safeSetTextColor(colors.gray);
              const notesText = pdf!.splitTextToSize(`Notes: ${rating.notes}`, contentWidth - (cardPadding * 2));
              pdf!.text(notesText[0] || '', margin + cardPadding, currentY + 12);
            }
            
            currentY += rowHeight;
          } catch (rowError) {
            console.warn('Failed to add rating row:', rowError);
            currentY += rowHeight; // Continue with next row
          }
        });
        
        return yPos + totalTableHeight + sectionSpacing;
      } catch (error) {
        console.warn('Failed to add site visit ratings table:', error);
        return yPos + 50; // Return some spacing even if table fails
      }
    };

    // Helper function to add enhanced image with timeout
    const addImageToPage = async (imageUrl: string, yPos: number, maxHeight: number = 80) => {
      try {
        if (!options.includeImages) {
          console.log('Images disabled, skipping:', imageUrl);
          return yPos;
        }

        console.log('Attempting to load image for PDF:', imageUrl);
        
        const img = await loadImageWithTimeout(imageUrl, 2000);
        
        if (!img) {
          console.warn('Image failed to load, skipping:', imageUrl);
          return yPos;
        }

        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            console.warn('Canvas context not available, skipping image');
            return yPos;
          }
          
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
          
          // Image container with border
          const imageCardHeight = imgHeight + 16;
          addCard(margin, yPos, contentWidth, imageCardHeight, 'metric');
          
          const imgData = canvas.toDataURL('image/jpeg', 0.9);
          const xPos = margin + (contentWidth - imgWidth) / 2;
          
          pdf!.addImage(imgData, 'JPEG', xPos, yPos + 8, imgWidth, imgHeight);
          console.log('Image added successfully:', imageUrl);
          return yPos + imageCardHeight + sectionSpacing;
        } catch (error) {
          console.warn('Failed to process image:', imageUrl, error);
          return yPos;
        }
      } catch (error) {
        console.warn('Failed to add image to PDF:', imageUrl, error);
        return yPos;
      }
    };

    // Start building the PDF
    let currentPage = 1;
    console.log('Adding logo to PDF...');
    await addLogo();
    
    // PAGE 1: Title and Assessment Overview
    addPageHeader('Site Assessment Report');
    let yPosition = margin + 25;
    
    // Main title
    try {
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      safeSetTextColor(colors.primary);
      pdf.text('Site Assessment Report', margin, yPosition);
      yPosition += 25;
    } catch (error) {
      console.warn('Failed to add main title:', error);
      yPosition += 25;
    }
    
    // Assessment overview section
    yPosition = addSectionHeader('Assessment Overview', yPosition, '📋');
    
    const overviewHeight = 60;
    addCard(margin, yPosition, contentWidth, overviewHeight, 'metric');
    
    try {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      safeSetTextColor(colors.darkText);
      
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
      safeSetTextColor(colors.mediumText);
      pdf.text(assessmentName, margin + cardPadding + 50, yPosition + 15);
      
      pdf.setFont('helvetica', 'bold');
      safeSetTextColor(colors.darkText);
      pdf.text('Address:', margin + cardPadding, yPosition + 25);
      pdf.setFont('helvetica', 'normal');
      safeSetTextColor(colors.mediumText);
      const addressLines = pdf.splitTextToSize(address, contentWidth - 80);
      let addressY = yPosition + 25;
      addressLines.forEach((line: string) => {
        pdf.text(line, margin + cardPadding + 50, addressY);
        addressY += 6;
      });
      
      pdf.setFont('helvetica', 'bold');
      safeSetTextColor(colors.darkText);
      pdf.text('Created Date:', margin + cardPadding, yPosition + 45);
      pdf.setFont('helvetica', 'normal');
      safeSetTextColor(colors.mediumText);
      pdf.text(createdDate, margin + cardPadding + 50, yPosition + 45);
      
      pdf.setFont('helvetica', 'bold');
      safeSetTextColor(colors.darkText);
      pdf.text('Target Metric Set:', margin + cardPadding, yPosition + 55);
      pdf.setFont('helvetica', 'normal');
      safeSetTextColor(colors.mediumText);
      pdf.text(exportData.targetMetricSet?.name || 'Not specified', margin + cardPadding + 50, yPosition + 55);
      
      yPosition += overviewHeight + sectionSpacing;
    } catch (error) {
      console.warn('Failed to add overview section:', error);
      yPosition += overviewHeight + sectionSpacing;
    }

    // Overall Performance section
    yPosition = addSectionHeader('Overall Performance', yPosition, '📊');
    
    const performanceHeight = 45;
    addCard(margin, yPosition, contentWidth, performanceHeight, 'metric');
    
    try {
      const overallScore = exportData.overallSiteSignalScore !== null 
        ? exportData.overallSiteSignalScore.toFixed(0) + '%' 
        : 'Not calculated';
      const completionRate = exportData.completionPercentage !== null 
        ? exportData.completionPercentage.toFixed(1) + '%' 
        : 'Unknown';
      
      // Large score display
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      safeSetTextColor(colors.primary);
      pdf.text(`Site Signal Score: ${overallScore}`, margin + cardPadding, yPosition + 20);
      
      pdf.setFontSize(16);
      safeSetTextColor(colors.mediumText);
      pdf.text(`Assessment Completion: ${completionRate}`, margin + cardPadding, yPosition + 35);
    } catch (error) {
      console.warn('Failed to add performance section:', error);
    }

    // PAGE 2+: Metric Categories
    if (exportData.detailedMetricScores && exportData.detailedMetricScores.size > 0) {
      const metricsByCategory = new Map<string, Array<{ key: string; data: any }>>();
      
      try {
        for (const [key, data] of exportData.detailedMetricScores.entries()) {
          const category = data.category || 'Uncategorized';
          if (!metricsByCategory.has(category)) {
            metricsByCategory.set(category, []);
          }
          metricsByCategory.get(category)!.push({ key, data });
        }

        console.log('Processing metric categories for PDF...');
        for (const [category, metrics] of metricsByCategory.entries()) {
          try {
            console.log(`Adding page for category: ${category}`);
            pdf.addPage();
            currentPage++;
            await addLogo();
            addPageHeader(`${category} Metrics`);
            yPosition = margin + 25;
            
            yPosition = addSectionHeader(category, yPosition, '🏷️');
            
            // Category image if available and option is enabled
            if (options.includeImages) {
              const categoryImage = metrics.find(m => m.data.imageUrl)?.data.imageUrl;
              if (categoryImage) {
                console.log(`Adding category image for ${category}:`, categoryImage);
                yPosition = await addImageToPage(categoryImage, yPosition, 60);
              }
            }
            
            // Convert metrics to table format
            const metricsTableData = metrics.map(({ key, data }) => ({
              label: getMetricDisplayLabel(key, exportData.targetMetricSet),
              enteredValue: data.enteredValue ?? 'N/A',
              targetValue: data.targetValue ?? 'N/A',
              score: data.score
            }));
            
            yPosition = addMetricTable(metricsTableData, yPosition, category);
          } catch (categoryError) {
            console.warn(`Failed to add category ${category}:`, categoryError);
          }
        }
      } catch (error) {
        console.warn('Failed to process metric categories:', error);
      }
    }

    // Site Visit Ratings Page
    if (exportData.assessment.site_visit_ratings && exportData.assessment.site_visit_ratings.length > 0) {
      try {
        console.log('Adding site visit ratings page...');
        pdf.addPage();
        currentPage++;
        await addLogo();
        addPageHeader('Site Visit Ratings');
        yPosition = margin + 25;
        
        yPosition = addSectionHeader('Site Visit Ratings', yPosition, '✅');
        
        // Site visit image if available and option is enabled
        if (options.includeImages) {
          const siteVisitImage = exportData.assessment.site_visit_ratings.find((r: any) => r.imageUrl)?.imageUrl;
          if (siteVisitImage) {
            console.log('Adding site visit image:', siteVisitImage);
            yPosition = await addImageToPage(siteVisitImage, yPosition, 60);
          }
        }
        
        yPosition = addSiteVisitRatingsTable(exportData.assessment.site_visit_ratings, yPosition);
      } catch (error) {
        console.warn('Failed to add site visit ratings page:', error);
      }
    }

    // Executive Summary Page
    if (exportData.assessment.executive_summary) {
      try {
        console.log('Adding executive summary page...');
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
        safeSetTextColor(colors.darkText);
        
        let summaryY = yPosition + 15;
        summaryLines.forEach((line: string) => {
          pdf.text(line, margin + cardPadding, summaryY);
          summaryY += 6;
        });
      } catch (error) {
        console.warn('Failed to add executive summary page:', error);
      }
    }

    // Add professional footer to all pages
    try {
      console.log('Adding footers to all pages...');
      const now = new Date();
      const exportDate = now.toLocaleDateString();
      const exportTime = now.toLocaleTimeString();
      const totalPages = pdf.getNumberOfPages();
      
      for (let i = 1; i <= totalPages; i++) {
        try {
          pdf.setPage(i);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          safeSetTextColor(colors.gray);
          
          // Footer line
          safeSetDrawColor(colors.borderGray);
          pdf.setLineWidth(0.5);
          pdf.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
          
          const footerText = `Generated by Good Signals | ${exportDate} at ${exportTime}`;
          pdf.text(footerText, margin, pageHeight - 12);
          
          const pageText = `Page ${i} of ${totalPages}`;
          const pageTextWidth = pdf.getTextWidth(pageText);
          pdf.text(pageText, pageWidth - margin - pageTextWidth, pageHeight - 12);
        } catch (footerError) {
          console.warn(`Failed to add footer to page ${i}:`, footerError);
        }
      }
    } catch (error) {
      console.warn('Failed to add footers:', error);
    }

    // Generate filename and save
    try {
      const fileNameAssessmentName = exportData.assessment.assessment_name || 'assessment';
      const sanitizedName = fileNameAssessmentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `site_assessment_${sanitizedName}_${new Date().getTime()}.pdf`;

      console.log('Saving PDF file:', fileName);
      pdf.save(fileName);
      
      console.log('Enhanced PDF export completed successfully:', fileName);
      return { success: true, fileName };
    } catch (saveError) {
      console.error('Failed to save PDF:', saveError);
      throw new Error('Failed to save PDF file');
    }
    
  } catch (error) {
    console.error('Error exporting assessment to PDF:', error);
    
    // Clean up PDF object if it was created
    if (pdf) {
      try {
        pdf = null;
      } catch (cleanupError) {
        console.warn('Failed to cleanup PDF object:', cleanupError);
      }
    }
    
    // Provide more specific error messages
    let errorMessage = 'Failed to export PDF';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    throw new Error(`PDF Export Error: ${errorMessage}`);
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
