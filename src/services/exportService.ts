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
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // Helper function to add text with automatic line breaks
    const addText = (text: string, fontSize: number = 10, isBold: boolean = false, indent: number = 0) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      
      const lines = pdf.splitTextToSize(text, contentWidth - indent);
      const lineHeight = fontSize * 0.35;
      
      // Check if we need a new page
      if (yPosition + (lines.length * lineHeight) > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      
      lines.forEach((line: string) => {
        pdf.text(line, margin + indent, yPosition);
        yPosition += lineHeight;
      });
      
      return yPosition;
    };

    // Helper function to add spacing
    const addSpacing = (space: number = 5) => {
      yPosition += space;
    };

    // 1. Header Section
    addText('Site Assessment Report', 20, true);
    addSpacing(10);

    // 2. Assessment Overview
    addText('Assessment Overview', 16, true);
    addSpacing(5);
    
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

    addText(`Assessment Name: ${assessmentName}`, 12, true);
    addText(`Address: ${address}`, 10);
    addText(`Date Created: ${createdDate}`, 10);
    addText(`Target Metric Set: ${exportData.targetMetricSet?.name || 'Not specified'}`, 10);
    addSpacing(10);

    // 3. Overall Scores
    addText('Overall Performance', 16, true);
    addSpacing(5);
    
    const overallScore = exportData.overallSiteSignalScore !== null 
      ? exportData.overallSiteSignalScore.toFixed(2) 
      : 'Not calculated';
    const completionRate = exportData.completionPercentage !== null 
      ? exportData.completionPercentage.toFixed(1) + '%' 
      : 'Unknown';
    
    addText(`Site Signal Score: ${overallScore} (out of 1.0)`, 12, true);
    addText(`Assessment Completion: ${completionRate}`, 10);
    addSpacing(10);

    // 4. Metric Categories and Scores
    if (exportData.detailedMetricScores && exportData.detailedMetricScores.size > 0) {
      addText('Detailed Metric Scores', 16, true);
      addSpacing(5);

      // Group metrics by category
      const metricsByCategory = new Map<string, Array<{ key: string; data: any }>>();
      
      for (const [key, data] of exportData.detailedMetricScores.entries()) {
        const category = data.category || 'Uncategorized';
        if (!metricsByCategory.has(category)) {
          metricsByCategory.set(category, []);
        }
        metricsByCategory.get(category)!.push({ key, data });
      }

      // Display metrics by category
      for (const [category, metrics] of metricsByCategory.entries()) {
        addText(category, 14, true);
        addSpacing(3);
        
        metrics.forEach(({ key, data }) => {
          const label = data.label || key;
          const score = data.score !== null ? data.score.toFixed(2) : 'N/A';
          const enteredValue = data.enteredValue ?? 'N/A';
          const targetValue = data.targetValue ?? 'N/A';
          const direction = data.higherIsBetter ? 'Higher is better' : 'Lower is better';
          
          addText(`• ${label}`, 10, true, 5);
          addText(`  Score: ${score} | Entered: ${enteredValue} | Target: ${targetValue}`, 9, false, 10);
          addText(`  ${direction}`, 9, false, 10);
          
          if (data.notes) {
            addText(`  Notes: ${data.notes}`, 9, false, 10);
          }
          addSpacing(3);
        });
        
        addSpacing(5);
      }
    }

    // 5. Site Visit Ratings (if available)
    if (exportData.assessment.site_visit_ratings && exportData.assessment.site_visit_ratings.length > 0) {
      addText('Site Visit Ratings', 16, true);
      addSpacing(5);
      
      exportData.assessment.site_visit_ratings.forEach((rating: any) => {
        const label = rating.label || rating.criterion_key;
        const grade = rating.rating_grade;
        const description = rating.rating_description || 'No description';
        
        addText(`• ${label}: Grade ${grade}`, 10, true, 5);
        addText(`  ${description}`, 9, false, 10);
        
        if (rating.notes) {
          addText(`  Notes: ${rating.notes}`, 9, false, 10);
        }
        addSpacing(3);
      });
      
      addSpacing(10);
    }

    // 6. Executive Summary (if available)
    if (exportData.assessment.executive_summary) {
      addText('Executive Summary', 16, true);
      addSpacing(5);
      addText(exportData.assessment.executive_summary, 10);
      addSpacing(10);
    }

    // 7. Footer
    const now = new Date();
    const exportDate = now.toLocaleDateString();
    const exportTime = now.toLocaleTimeString();
    
    // Add page numbers and export info to each page
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      
      // Footer text
      const footerText = `Exported on ${exportDate} at ${exportTime} | Page ${i} of ${pageCount}`;
      const footerWidth = pdf.getTextWidth(footerText);
      const footerX = (pageWidth - footerWidth) / 2;
      
      pdf.text(footerText, footerX, pageHeight - 10);
    }

    // Generate filename
    const sanitizedName = assessmentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
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
