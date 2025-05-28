
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { TargetMetricSet } from '@/types/targetMetrics';
import { Account } from '@/services/accountService';
import { getSignalStatus } from '@/lib/assessmentDisplayUtils';
import { format } from 'date-fns';

export interface ExportData {
  assessment: SiteAssessment;
  targetMetricSet: TargetMetricSet;
  accountSettings: Account | null;
  detailedMetricScores: Map<string, any>;
  overallSiteSignalScore: number | null;
  completionPercentage: number | null;
}

export interface ExportOptions {
  includeImages: boolean;
  pageOrientation: 'portrait' | 'landscape';
  imageQuality: 'high' | 'medium' | 'low';
}

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeImages: true,
  pageOrientation: 'portrait',
  imageQuality: 'medium',
};

// Convert image URL to base64 for embedding in PDF
export const convertImageToBase64 = async (imageUrl: string): Promise<string | null> => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    return null;
  }
};

// Helper function to add image to PDF with proper sizing
const addImageToPDF = async (
  pdf: jsPDF, 
  imageUrl: string, 
  x: number, 
  y: number, 
  maxWidth: number, 
  maxHeight: number
): Promise<number> => {
  try {
    const base64Image = await convertImageToBase64(imageUrl);
    if (!base64Image) return y;

    // Create a temporary image to get dimensions
    const img = new Image();
    img.src = base64Image;
    
    return new Promise((resolve) => {
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        let width = maxWidth;
        let height = maxWidth / aspectRatio;
        
        if (height > maxHeight) {
          height = maxHeight;
          width = maxHeight * aspectRatio;
        }
        
        pdf.addImage(base64Image, 'JPEG', x, y, width, height);
        resolve(y + height + 10); // Return new Y position
      };
      img.onerror = () => resolve(y);
    });
  } catch (error) {
    console.error('Error adding image to PDF:', error);
    return y;
  }
};

// Generate PDF header
const addPDFHeader = (pdf: jsPDF, assessment: SiteAssessment, pageNumber: number) => {
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text(`Site Assessment: ${assessment.assessment_name || 'Untitled'}`, 20, 15);
  pdf.text(`Page ${pageNumber}`, pdf.internal.pageSize.width - 40, 15);
  pdf.text(`Generated: ${format(new Date(), 'MMM dd, yyyy')}`, 20, pdf.internal.pageSize.height - 15);
  
  // Add a line under header
  pdf.setDrawColor(200);
  pdf.line(20, 20, pdf.internal.pageSize.width - 20, 20);
};

// Generate assessment overview page
const generateOverviewPage = async (
  pdf: jsPDF, 
  exportData: ExportData, 
  options: ExportOptions
): Promise<void> => {
  const { assessment, accountSettings, overallSiteSignalScore, completionPercentage } = exportData;
  
  addPDFHeader(pdf, assessment, 1);
  
  let yPos = 40;
  
  // Title
  pdf.setFontSize(20);
  pdf.setTextColor(0);
  pdf.text('Site Assessment Report', 20, yPos);
  yPos += 20;
  
  // Assessment details
  pdf.setFontSize(12);
  pdf.text(`Assessment Name: ${assessment.assessment_name || 'Untitled'}`, 20, yPos);
  yPos += 10;
  pdf.text(`Address: ${assessment.address_line1 || 'Not specified'}`, 20, yPos);
  yPos += 10;
  pdf.text(`Site Status: ${assessment.site_status || 'Prospect'}`, 20, yPos);
  yPos += 10;
  pdf.text(`Created: ${format(new Date(assessment.created_at), 'MMM dd, yyyy')}`, 20, yPos);
  yPos += 20;
  
  // Overall score
  if (overallSiteSignalScore !== null) {
    const signalStatus = getSignalStatus(
      overallSiteSignalScore,
      accountSettings?.signal_good_threshold,
      accountSettings?.signal_bad_threshold
    );
    
    pdf.setFontSize(14);
    pdf.text('Overall Site Signal Score', 20, yPos);
    yPos += 15;
    
    pdf.setFontSize(16);
    let scoreColor: [number, number, number];
    if (signalStatus === 'good') {
      scoreColor = [0, 128, 0];
    } else if (signalStatus === 'bad') {
      scoreColor = [255, 0, 0];
    } else {
      scoreColor = [255, 165, 0];
    }
    pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    pdf.text(`${Math.round(overallSiteSignalScore * 100)}%`, 20, yPos);
    pdf.setTextColor(0);
    yPos += 20;
  }
  
  // Completion percentage
  if (completionPercentage !== null) {
    pdf.text(`Data Completion: ${Math.round(completionPercentage)}%`, 20, yPos);
    yPos += 20;
  }
  
  // Executive summary
  if (assessment.executive_summary) {
    pdf.setFontSize(14);
    pdf.text('Executive Summary', 20, yPos);
    yPos += 15;
    
    pdf.setFontSize(10);
    const splitSummary = pdf.splitTextToSize(assessment.executive_summary, 170);
    pdf.text(splitSummary, 20, yPos);
  }
};

// Generate metric category page
const generateCategoryPage = async (
  pdf: jsPDF,
  category: string,
  metrics: any[],
  categoryImage: string | undefined,
  exportData: ExportData,
  options: ExportOptions,
  pageNumber: number
): Promise<void> => {
  pdf.addPage();
  addPDFHeader(pdf, exportData.assessment, pageNumber);
  
  let yPos = 40;
  
  // Category title
  pdf.setFontSize(16);
  pdf.setTextColor(0);
  pdf.text(`${category} Metrics`, 20, yPos);
  yPos += 20;
  
  // Category image
  if (categoryImage && options.includeImages) {
    yPos = await addImageToPDF(pdf, categoryImage, 20, yPos, 170, 60);
    yPos += 10;
  }
  
  // Metrics table header
  pdf.setFontSize(10);
  pdf.setFillColor(240, 240, 240);
  pdf.rect(20, yPos, 170, 8, 'F');
  pdf.text('Metric', 25, yPos + 5);
  pdf.text('Entered Value', 80, yPos + 5);
  pdf.text('Target Value', 120, yPos + 5);
  pdf.text('Score', 160, yPos + 5);
  yPos += 8;
  
  // Metrics data
  metrics.forEach((metric, index) => {
    if (yPos > 250) { // Start new page if needed
      pdf.addPage();
      addPDFHeader(pdf, exportData.assessment, pageNumber + 1);
      yPos = 40;
    }
    
    if (index % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(20, yPos, 170, 8, 'F');
    }
    
    pdf.text(metric.label.substring(0, 25), 25, yPos + 5);
    pdf.text(metric.enteredValue.toString().substring(0, 15), 80, yPos + 5);
    pdf.text(metric.targetValue.toString().substring(0, 15), 120, yPos + 5);
    
    if (metric.score !== null) {
      const scoreText = `${Math.round(metric.score * 100)}%`;
      let scoreColor: [number, number, number];
      if (metric.metricScoreStatus === 'good') {
        scoreColor = [0, 128, 0];
      } else if (metric.metricScoreStatus === 'bad') {
        scoreColor = [255, 0, 0];
      } else {
        scoreColor = [255, 165, 0];
      }
      pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      pdf.text(scoreText, 160, yPos + 5);
      pdf.setTextColor(0);
    }
    
    yPos += 8;
  });
};

// Generate site visit ratings page
const generateSiteVisitPage = async (
  pdf: jsPDF,
  siteVisitRatings: any[],
  siteVisitImage: string | undefined,
  exportData: ExportData,
  options: ExportOptions,
  pageNumber: number
): Promise<void> => {
  pdf.addPage();
  addPDFHeader(pdf, exportData.assessment, pageNumber);
  
  let yPos = 40;
  
  // Title
  pdf.setFontSize(16);
  pdf.setTextColor(0);
  pdf.text('Site Visit Ratings', 20, yPos);
  yPos += 20;
  
  // Site visit image
  if (siteVisitImage && options.includeImages) {
    yPos = await addImageToPDF(pdf, siteVisitImage, 20, yPos, 170, 60);
    yPos += 10;
  }
  
  // Ratings table
  if (siteVisitRatings.length > 0) {
    pdf.setFontSize(10);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, yPos, 170, 8, 'F');
    pdf.text('Criterion', 25, yPos + 5);
    pdf.text('Rating', 120, yPos + 5);
    pdf.text('Grade', 160, yPos + 5);
    yPos += 8;
    
    siteVisitRatings.forEach((rating, index) => {
      if (yPos > 250) {
        pdf.addPage();
        addPDFHeader(pdf, exportData.assessment, pageNumber + 1);
        yPos = 40;
      }
      
      if (index % 2 === 0) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(20, yPos, 170, 8, 'F');
      }
      
      pdf.text(rating.criterion_key.substring(0, 30), 25, yPos + 5);
      pdf.text(rating.rating_description?.substring(0, 20) || 'N/A', 120, yPos + 5);
      pdf.text(rating.rating_grade, 160, yPos + 5);
      yPos += 8;
    });
  }
};

// Main export function
export const exportAssessmentToPDF = async (
  exportData: ExportData,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS
): Promise<void> => {
  const { assessment, targetMetricSet } = exportData;
  
  // Create PDF
  const pdf = new jsPDF({
    orientation: options.pageOrientation,
    unit: 'mm',
    format: 'a4'
  });
  
  let pageNumber = 1;
  
  // Generate overview page
  await generateOverviewPage(pdf, exportData, options);
  pageNumber++;
  
  // Generate location map page if coordinates exist
  if (assessment.latitude && assessment.longitude) {
    // For now, just add a placeholder - could integrate with map service later
    pdf.addPage();
    addPDFHeader(pdf, assessment, pageNumber);
    pdf.setFontSize(16);
    pdf.text('Site Location', 20, 40);
    pdf.setFontSize(12);
    pdf.text(`Latitude: ${assessment.latitude}`, 20, 60);
    pdf.text(`Longitude: ${assessment.longitude}`, 20, 75);
    pageNumber++;
  }
  
  // Generate category pages
  if (targetMetricSet?.user_custom_metrics_settings) {
    const categories = [...new Set(targetMetricSet.user_custom_metrics_settings.map(m => m.category))];
    
    for (const category of categories) {
      const metricsForCategory = targetMetricSet.user_custom_metrics_settings
        .filter(setting => setting.category === category)
        .map(setting => {
          const metricDetail = exportData.detailedMetricScores.get(setting.metric_identifier);
          return {
            label: setting.label,
            enteredValue: metricDetail?.enteredValue ?? 'N/A',
            targetValue: metricDetail?.targetValue ?? 'N/A',
            score: metricDetail?.score,
            metricScoreStatus: getSignalStatus(
              metricDetail?.score ?? null,
              exportData.accountSettings?.signal_good_threshold,
              exportData.accountSettings?.signal_bad_threshold
            )
          };
        });
      
      const categoryImage = assessment.assessment_metric_values?.find(
        mv => mv.metric_identifier === `category_${category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_image_overall`
      )?.image_url;
      
      await generateCategoryPage(pdf, category, metricsForCategory, categoryImage, exportData, options, pageNumber);
      pageNumber++;
    }
  }
  
  // Generate site visit ratings page
  if (assessment.site_visit_ratings && assessment.site_visit_ratings.length > 0) {
    const siteVisitImage = assessment.assessment_metric_values?.find(
      mv => mv.metric_identifier === 'site_visit_section_image_overall'
    )?.image_url;
    
    await generateSiteVisitPage(pdf, assessment.site_visit_ratings, siteVisitImage, exportData, options, pageNumber);
  }
  
  // Generate filename and download
  const filename = `${assessment.assessment_name || 'site_assessment'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  pdf.save(filename);
};
