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

// Helper function to get simple status string
const getSimpleSignalStatus = (
  score: number | null,
  accountGoodThreshold?: number | null,
  accountBadThreshold?: number | null
): 'good' | 'bad' | 'neutral' => {
  if (score === null || score === undefined) {
    return 'neutral';
  }

  // Convert percentage score (0-100) to decimal for threshold comparison
  const scoreAsDecimal = score / 100;
  
  const DEFAULT_GOOD_THRESHOLD = 0.75;
  const DEFAULT_BAD_THRESHOLD = 0.50;
  
  const goodThreshold = accountGoodThreshold ?? DEFAULT_GOOD_THRESHOLD;
  const badThreshold = accountBadThreshold ?? DEFAULT_BAD_THRESHOLD;

  if (scoreAsDecimal >= goodThreshold) {
    return 'good';
  }
  if (scoreAsDecimal <= badThreshold) {
    return 'bad';
  }
  return 'neutral';
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

// Add Good Signals logo to PDF
const addGoodSignalsLogo = async (pdf: jsPDF): Promise<void> => {
  try {
    // Add the Good Signals logo in the top right corner
    const logoUrl = '/lovable-uploads/7d8f7f4b-7a71-4284-844b-3c77d693eabc.png';
    const base64Logo = await convertImageToBase64(logoUrl);
    
    if (base64Logo) {
      // Position logo in top right corner with appropriate sizing
      const logoWidth = 30;
      const logoHeight = 8;
      const x = pdf.internal.pageSize.width - logoWidth - 10;
      const y = 5;
      
      pdf.addImage(base64Logo, 'PNG', x, y, logoWidth, logoHeight);
    } else {
      // Fallback to text if logo fails to load
      pdf.setFontSize(8);
      pdf.setTextColor(100);
      pdf.text('Good Signals', pdf.internal.pageSize.width - 40, 10);
    }
  } catch (error) {
    console.error('Error adding logo:', error);
    // Fallback to text
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text('Good Signals', pdf.internal.pageSize.width - 40, 10);
  }
};

// Generate Google Maps static image URL using Supabase edge function
const generateMapImageUrl = async (latitude: number, longitude: number): Promise<string | null> => {
  try {
    const response = await fetch('https://thfphcgufrygruqoekvz.supabase.co/functions/v1/generate-map-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZnBoY2d1ZnJ5Z3J1cW9la3Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzMTIwNDEsImV4cCI6MjA2Mzg4ODA0MX0.i10fd7Ix3fTnAFEIVjIw8b9w0R8TPHsSI62Fr61XNto'}`,
      },
      body: JSON.stringify({
        latitude,
        longitude,
        zoom: 15,
        size: '600x300',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate map image');
    }

    const data = await response.json();
    return data.imageUrl;
  } catch (error) {
    console.error('Error generating map image:', error);
    return null;
  }
};

// Generate PDF header with logo
const addPDFHeader = async (pdf: jsPDF, assessment: SiteAssessment, pageNumber: number) => {
  await addGoodSignalsLogo(pdf);
  
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text(`Site Assessment: ${assessment.assessment_name || 'Untitled'}`, 20, 15);
  pdf.text(`Page ${pageNumber}`, pdf.internal.pageSize.width - 40, 15);
  
  // Add a line under header
  pdf.setDrawColor(200);
  pdf.line(20, 20, pdf.internal.pageSize.width - 20, 20);
};

// Generate PDF footer with Good Signals branding
const addPDFFooter = (pdf: jsPDF) => {
  const pageHeight = pdf.internal.pageSize.height;
  pdf.setFontSize(8);
  pdf.setTextColor(100);
  
  // Center the footer text
  const footerText = 'Report Generated by Good Signals. For questions, reach out to howdy@goodsignals.ai.';
  const textWidth = pdf.getTextWidth(footerText);
  const pageWidth = pdf.internal.pageSize.width;
  const x = (pageWidth - textWidth) / 2;
  
  pdf.text(footerText, x, pageHeight - 10);
  
  // Add generation date on the left
  pdf.text(`Generated: ${format(new Date(), 'MMM dd, yyyy')}`, 20, pageHeight - 10);
};

// Build full address string
const buildFullAddress = (assessment: SiteAssessment): string => {
  const addressParts = [
    assessment.address_line1,
    assessment.address_line2,
    assessment.city,
    assessment.state_province,
    assessment.postal_code,
    assessment.country
  ].filter(part => part && part.trim() !== '');
  
  return addressParts.length > 0 ? addressParts.join(', ') : 'Address not specified';
};

// Generate assessment overview page
const generateOverviewPage = async (
  pdf: jsPDF, 
  exportData: ExportData, 
  options: ExportOptions
): Promise<void> => {
  const { assessment, accountSettings, overallSiteSignalScore, completionPercentage } = exportData;
  
  await addPDFHeader(pdf, assessment, 1);
  
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
  
  // Full address display
  const fullAddress = buildFullAddress(assessment);
  pdf.text(`Address: ${fullAddress}`, 20, yPos);
  yPos += 10;
  
  pdf.text(`Site Status: ${assessment.site_status || 'Prospect'}`, 20, yPos);
  yPos += 10;
  pdf.text(`Created: ${format(new Date(assessment.created_at), 'MMM dd, yyyy')}`, 20, yPos);
  yPos += 20;
  
  // Overall score - scores are stored as percentages (0-100), display as is
  if (overallSiteSignalScore !== null) {
    const signalStatus = getSimpleSignalStatus(
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
    // Display score as percentage (score is already 0-100, just add % sign)
    pdf.text(`${Math.round(overallSiteSignalScore)}%`, 20, yPos);
    pdf.setTextColor(0);
    yPos += 20;
  }
  
  // Completion percentage - stored as percentage (0-100), display as is
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
  
  addPDFFooter(pdf);
};

// Generate location map page with Google Maps integration
const generateLocationMapPage = async (
  pdf: jsPDF,
  assessment: SiteAssessment,
  pageNumber: number,
  options: ExportOptions
): Promise<void> => {
  pdf.addPage();
  await addPDFHeader(pdf, assessment, pageNumber);
  
  let yPos = 40;
  
  // Title
  pdf.setFontSize(16);
  pdf.setTextColor(0);
  pdf.text('Site Location', 20, yPos);
  yPos += 20;
  
  // Address details
  pdf.setFontSize(12);
  const fullAddress = buildFullAddress(assessment);
  pdf.text(`Address: ${fullAddress}`, 20, yPos);
  yPos += 15;
  
  if (assessment.latitude && assessment.longitude) {
    pdf.text(`Coordinates: ${assessment.latitude}, ${assessment.longitude}`, 20, yPos);
    yPos += 20;
    
    // Add map image if images are enabled in export options
    if (options.includeImages) {
      try {
        const mapImageUrl = await generateMapImageUrl(
          Number(assessment.latitude),
          Number(assessment.longitude)
        );
        
        if (mapImageUrl) {
          yPos = await addImageToPDF(pdf, mapImageUrl, 20, yPos, 170, 100);
        } else {
          // Fallback if map image generation fails
          pdf.setFontSize(10);
          pdf.text('Map image could not be generated', 20, yPos);
          yPos += 15;
        }
      } catch (error) {
        console.error('Error adding map to PDF:', error);
        pdf.setFontSize(10);
        pdf.text('Map image could not be generated', 20, yPos);
        yPos += 15;
      }
    } else {
      // Map disabled in export options
      pdf.setFontSize(10);
      pdf.text('Map display disabled in export options', 20, yPos);
      yPos += 15;
    }
  }
  
  addPDFFooter(pdf);
};

// Generate metric category page with improved image handling
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
  await addPDFHeader(pdf, exportData.assessment, pageNumber);
  
  let yPos = 40;
  
  // Category title
  pdf.setFontSize(16);
  pdf.setTextColor(0);
  pdf.text(`${category} Metrics`, 20, yPos);
  yPos += 20;
  
  // Category image with better detection
  if (options.includeImages) {
    // Try multiple image identifier patterns
    const possibleImageIdentifiers = [
      `category_${category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_image_overall`,
      `${category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_image`,
      `${category}_image_overall`,
      `category_${category}_image`
    ];
    
    let foundImage = null;
    for (const identifier of possibleImageIdentifiers) {
      foundImage = exportData.assessment.assessment_metric_values?.find(
        mv => mv.metric_identifier === identifier
      )?.image_url;
      if (foundImage) break;
    }
    
    if (foundImage || categoryImage) {
      yPos = await addImageToPDF(pdf, foundImage || categoryImage!, 20, yPos, 170, 60);
      yPos += 10;
    }
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
      // Score is already stored as percentage (0-100), display as is
      const scoreText = `${Math.round(metric.score)}%`;
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
  
  addPDFFooter(pdf);
};

// Generate site visit ratings page with improved image handling
const generateSiteVisitPage = async (
  pdf: jsPDF,
  siteVisitRatings: any[],
  siteVisitImage: string | undefined,
  exportData: ExportData,
  options: ExportOptions,
  pageNumber: number
): Promise<void> => {
  pdf.addPage();
  await addPDFHeader(pdf, exportData.assessment, pageNumber);
  
  let yPos = 40;
  
  // Title
  pdf.setFontSize(16);
  pdf.setTextColor(0);
  pdf.text('Site Visit Ratings', 20, yPos);
  yPos += 20;
  
  // Site visit image with better detection
  if (options.includeImages) {
    const possibleImageIdentifiers = [
      'site_visit_section_image_overall',
      'site_visit_image_overall',
      'site_visit_image',
      'sitevisit_image_overall'
    ];
    
    let foundImage = null;
    for (const identifier of possibleImageIdentifiers) {
      foundImage = exportData.assessment.assessment_metric_values?.find(
        mv => mv.metric_identifier === identifier
      )?.image_url;
      if (foundImage) break;
    }
    
    if (foundImage || siteVisitImage) {
      yPos = await addImageToPDF(pdf, foundImage || siteVisitImage!, 20, yPos, 170, 60);
      yPos += 10;
    }
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
  
  addPDFFooter(pdf);
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
    await generateLocationMapPage(pdf, assessment, pageNumber, options);
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
