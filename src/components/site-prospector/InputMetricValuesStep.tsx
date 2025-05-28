import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowRight, ArrowLeft, Info, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTargetMetricSetById } from '@/services/targetMetricsService';
import { saveAssessmentMetricValues, getAssessmentMetricValues, getSiteVisitRatings, saveSiteVisitRatings, updateSiteStatus, getAssessmentDetails } from '@/services/siteAssessmentService';
import { TargetMetricSet, UserCustomMetricSetting } from '@/types/targetMetrics';
import { AssessmentMetricValueInsert, siteVisitCriteria, SiteVisitCriterionKey, SiteVisitRatingGrade, AssessmentSiteVisitRatingInsert, AssessmentMetricValue } from '@/types/siteAssessmentTypes';
import { supabase } from '@/integrations/supabase/client';
import SiteStatusSelector from './SiteStatusSelector';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ImageUploadField from './ImageUploadField';

// Import shared config and remove local definitions
import { metricDropdownOptions, specificDropdownMetrics } from '@/config/metricDisplayConfig';

// Constants for special image metric identifiers
const SITE_VISIT_SECTION_IMAGE_IDENTIFIER = 'site_visit_section_image_overall';
const getCategorySpecificImageIdentifier = (category: string) => `category_${category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_image_overall`;

// Session storage keys for form persistence
const getFormDataSessionKey = (assessmentId: string) => `inputMetricValues_formData_${assessmentId}`;
const getImageDataSessionKey = (assessmentId: string) => `inputMetricValues_imageData_${assessmentId}`;

// Define a type for the image-only metric objects we'll manage in the form state
type ImageOnlyFormMetric = {
  id: string; // React Hook Form field ID
  metric_identifier: string;
  label: string;
  category: string; // Can be the original category or a special one
  image_url: string | null;
  image_file: File | null;
  // Add other fields from metricValueSchema with placeholder/dummy values if necessary
  entered_value: number; // Dummy, as schema requires it
  measurement_type: string | null;
  notes: string | null;
};

const metricValueSchema = z.object({
  metric_identifier: z.string(),
  label: z.string(),
  category: z.string(),
  // For regular metrics, entered_value is required. For image placeholders, it'll be a dummy.
  entered_value: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : parseFloat(String(val))),
    z.number({invalid_type_error: "Value must be a number"}).nullable() // Allow null for image placeholders
  ),
  measurement_type: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  image_file: z.instanceof(File).optional().nullable(),
});

const siteVisitRatingItemSchema = z.object({
  criterion_key: z.string(),
  grade: z.string().optional().nullable(), // Allow null
  notes: z.string().optional().nullable(),
  // Individual site visit ratings will no longer have their own images
  // image_url: z.string().optional().nullable(),
  // image_file: z.instanceof(File).optional().nullable(),
});

const formSchema = z.object({
  metrics: z.array(metricValueSchema),
  siteVisitRatings: z.array(siteVisitRatingItemSchema),
  siteStatus: z.string().optional(),
});

type MetricValuesFormData = z.infer<typeof formSchema>;

interface InputMetricValuesStepProps {
  assessmentId: string;
  targetMetricSetId: string;
  onMetricsSubmitted: (assessmentId: string) => void;
  onBack: () => void;
}

const InputMetricValuesStep: React.FC<InputMetricValuesStepProps> = ({
  assessmentId,
  targetMetricSetId,
  onMetricsSubmitted,
  onBack,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Add query for current assessment details to get site status
  const { data: currentAssessment } = useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: () => getAssessmentDetails(assessmentId),
    enabled: !!assessmentId,
  });

  const { data: metricSet, isLoading: isLoadingMetricSet, error: metricSetError } = useQuery<TargetMetricSet | null, Error>({
    queryKey: ['targetMetricSet', targetMetricSetId, user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error('User not authenticated');
      return getTargetMetricSetById(targetMetricSetId, user.id);
    },
    enabled: !!user?.id && !!targetMetricSetId,
  });

  const { data: existingMetricValuesData, isLoading: isLoadingExistingValues } = useQuery<AssessmentMetricValue[], Error>({
    queryKey: ['assessmentMetricValues', assessmentId],
    queryFn: () => getAssessmentMetricValues(assessmentId),
    enabled: !!assessmentId,
  });
  
  const { data: existingSiteVisitRatingsData, isLoading: isLoadingSiteVisitRatings } = useQuery<AssessmentSiteVisitRatingInsert[], Error>({
    queryKey: ['siteVisitRatings', assessmentId],
    queryFn: () => getSiteVisitRatings(assessmentId),
    enabled: !!assessmentId,
  });
  
  const { control, handleSubmit, reset, formState: { errors, isSubmitting }, watch, setValue } = useForm<MetricValuesFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { metrics: [], siteVisitRatings: [], siteStatus: 'Prospect' },
  });

  const { fields: metricFields, replace: replaceMetrics, append: appendMetric, remove: removeMetric } = useFieldArray({
    control,
    name: "metrics",
  });

  const { fields: siteVisitRatingFields, replace: replaceSiteVisitRatings } = useFieldArray({
    control,
    name: "siteVisitRatings",
  });
  
  // State to manage the indices of image-only metrics within the metrics array
  const [imageOnlyMetricIndices, setImageOnlyMetricIndices] = useState<Record<string, number>>({});

  // Add mutation for updating site status
  const updateSiteStatusMutation = useMutation({
    mutationFn: ({ siteStatus }: { siteStatus: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return updateSiteStatus(assessmentId, siteStatus, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] });
      queryClient.invalidateQueries({ queryKey: ['siteAssessments', user?.id] });
    },
    onError: (error: Error) => {
      toast({ title: "Error Updating Status", description: `Failed to update site status: ${error.message}`, variant: "destructive" });
    },
  });

  // Save form data to session storage whenever form data changes
  useEffect(() => {
    const subscription = watch((value) => {
      try {
        // Convert the form data to a serializable format (excluding File objects)
        const serializableData = {
          metrics: value.metrics?.map(metric => ({
            ...metric,
            image_file: null, // Don't persist files in session storage
          })) || [],
          siteVisitRatings: value.siteVisitRatings || [],
          siteStatus: value.siteStatus || 'Prospect',
        };
        
        sessionStorage.setItem(getFormDataSessionKey(assessmentId), JSON.stringify(serializableData));
      } catch (error) {
        console.warn('Failed to save form data to session storage:', error);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [watch, assessmentId]);

  // Clear session storage when component unmounts (assessment is completed)
  useEffect(() => {
    return () => {
      // Only clear on unmount if we're not just navigating away
      const cleanup = () => {
        sessionStorage.removeItem(getFormDataSessionKey(assessmentId));
        sessionStorage.removeItem(getImageDataSessionKey(assessmentId));
      };
      
      // Add a small delay to allow for navigation detection
      setTimeout(cleanup, 100);
    };
  }, [assessmentId]);

  // Load saved form data from session storage and merge with database data
  const loadSavedFormData = () => {
    try {
      const savedDataJson = sessionStorage.getItem(getFormDataSessionKey(assessmentId));
      if (savedDataJson) {
        const savedData = JSON.parse(savedDataJson) as Partial<MetricValuesFormData>;
        return savedData;
      }
    } catch (error) {
      console.warn('Failed to load saved form data from session storage:', error);
    }
    return null;
  };

  // Initialize form data
  useEffect(() => {
    const savedFormData = loadSavedFormData();
    const allMetricsToSet: any[] = [];
    const currentImageOnlyIndices: Record<string, number> = {};

    // 1. Process regular metrics from metricSet
    if (metricSet?.user_custom_metrics_settings) {
      metricSet.user_custom_metrics_settings.forEach(metric => {
        const existingValue = existingMetricValuesData?.find(ev => ev.metric_identifier === metric.metric_identifier);
        
        // Check if we have saved form data for this metric
        const savedMetricData = savedFormData?.metrics?.find(sm => sm.metric_identifier === metric.metric_identifier);
        
        let defaultValue: number | null;
        if (savedMetricData?.entered_value !== undefined && savedMetricData?.entered_value !== null) {
          // Use saved form data if available
          defaultValue = savedMetricData.entered_value;
        } else if (existingValue?.entered_value !== undefined && existingValue?.entered_value !== null) {
          // Fall back to database value
          defaultValue = existingValue.entered_value;
        } else if (specificDropdownMetrics.includes(metric.metric_identifier)) {
          defaultValue = 50;
        } else {
          defaultValue = metric.measurement_type === 'Index' ? 50 : 0;
        }

        const notes = savedMetricData?.notes ?? existingValue?.notes ?? '';

        allMetricsToSet.push({
          metric_identifier: metric.metric_identifier,
          label: metric.label,
          category: metric.category,
          entered_value: defaultValue,
          measurement_type: metric.measurement_type,
          notes: notes,
          image_url: null, // Individual metrics no longer have images
          image_file: null,
        });
      });
    }

    // 2. Process category-specific images
    const categories = metricSet?.user_custom_metrics_settings
      ? [...new Set(metricSet.user_custom_metrics_settings.map(m => m.category))]
      : [];

    categories.forEach(category => {
      const identifier = getCategorySpecificImageIdentifier(category);
      const existingImageMetric = existingMetricValuesData?.find(ev => ev.metric_identifier === identifier);
      currentImageOnlyIndices[identifier] = allMetricsToSet.length;
      allMetricsToSet.push({
        metric_identifier: identifier,
        label: `${category} Section Image`,
        category: category, // Keep original category for grouping, or use a special one
        entered_value: null, // Dummy value
        measurement_type: 'image_placeholder_category',
        notes: null,
        image_url: existingImageMetric?.image_url ?? null,
        image_file: null,
      });
    });

    // 3. Process Site Visit section image
    const siteVisitImageIdentifier = SITE_VISIT_SECTION_IMAGE_IDENTIFIER;
    const existingSiteVisitSectionImage = existingMetricValuesData?.find(ev => ev.metric_identifier === siteVisitImageIdentifier);
    currentImageOnlyIndices[siteVisitImageIdentifier] = allMetricsToSet.length;
    allMetricsToSet.push({
      metric_identifier: siteVisitImageIdentifier,
      label: 'Site Visit Section Image',
      category: 'SiteVisitSectionImages', // Special category for this
      entered_value: null, // Dummy value
      measurement_type: 'image_placeholder_section',
      notes: null,
      image_url: existingSiteVisitSectionImage?.image_url ?? null,
      image_file: null,
    });
    
    replaceMetrics(allMetricsToSet);
    setImageOnlyMetricIndices(currentImageOnlyIndices);

    if (siteVisitCriteria) {
      const initialSiteVisitRatingsData = siteVisitCriteria.map(criterion => {
        const existingRating = existingSiteVisitRatingsData?.find(r => r.criterion_key === criterion.key);
        
        // Check if we have saved form data for this rating
        const savedRatingData = savedFormData?.siteVisitRatings?.find(sr => sr.criterion_key === criterion.key);
        
        return {
          criterion_key: criterion.key,
          grade: savedRatingData?.grade ?? existingRating?.rating_grade ?? '',
          notes: savedRatingData?.notes ?? existingRating?.notes ?? '',
        };
      });
      replaceSiteVisitRatings(initialSiteVisitRatingsData);
    }

    // Set the site status (prioritize saved data, then current assessment, then default)
    const siteStatus = savedFormData?.siteStatus ?? currentAssessment?.site_status ?? 'Prospect';
    setValue('siteStatus', siteStatus);

  }, [metricSet, existingMetricValuesData, existingSiteVisitRatingsData, replaceMetrics, replaceSiteVisitRatings, setValue, currentAssessment?.site_status]);

  const metricsMutation = useMutation({
    mutationFn: (data: AssessmentMetricValueInsert[]) => {
        if (!user?.id) throw new Error('User not authenticated');
        // Filter out any metrics with null entered_value if they are not image placeholders
        const validData = data.filter(d => 
            d.entered_value !== null || 
            d.metric_identifier.includes('_image_overall') || 
            d.metric_identifier === SITE_VISIT_SECTION_IMAGE_IDENTIFIER
        );
        if (validData.length === 0) return Promise.resolve([]); // No valid data to save
        return saveAssessmentMetricValues(assessmentId, validData);
    },
    onError: (error: Error) => {
      toast({ title: "Error Saving Metrics", description: `Failed to save metric values: ${error.message}`, variant: "destructive" });
    },
  });

  const siteVisitRatingsMutation = useMutation({
    mutationFn: (ratingsToSave: AssessmentSiteVisitRatingInsert[]) => saveSiteVisitRatings(assessmentId, ratingsToSave),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Site visit ratings saved successfully.' });
      queryClient.invalidateQueries({ queryKey: ['siteVisitRatings', assessmentId] });
      
      // Clear session storage on successful completion
      sessionStorage.removeItem(getFormDataSessionKey(assessmentId));
      sessionStorage.removeItem(getImageDataSessionKey(assessmentId));
      
      onMetricsSubmitted(assessmentId); 
    },
    onError: (error: Error) => {
      toast({ title: 'Error Saving Site Visit Ratings', description: `Failed to save ratings: ${error.message}`, variant: 'destructive' });
    },
  });

  const uploadImage = async (file: File, assessmentId: string, identifier: string): Promise<string | null> => {
    if (!user?.id) throw new Error("User not authenticated for image upload.");
    const filePath = `public/${user.id}/${assessmentId}/${identifier}-${Date.now()}-${file.name}`;
    
    const { data, error } = await supabase.storage
      .from('assessment_images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, 
      });

    if (error) {
      console.error('Error uploading image:', error);
      toast({ title: "Image Upload Failed", description: error.message, variant: "destructive" });
      return null;
    }

    const { data: { publicUrl } } = supabase.storage.from('assessment_images').getPublicUrl(filePath);
    return publicUrl;
  };

  const deleteImage = async (imageUrl: string | null | undefined): Promise<void> => {
    if (!imageUrl) return;
    try {
        const urlParts = imageUrl.split('/assessment_images/');
        if (urlParts.length < 2) {
            console.warn("Could not parse file path from image URL for deletion:", imageUrl);
            return;
        }
        const filePath = urlParts[1];
        
        const { error } = await supabase.storage
            .from('assessment_images')
            .remove([filePath]);
        
        if (error) {
            console.error("Error deleting image from storage:", error);
            toast({ title: "Image Deletion Failed", description: error.message, variant: "destructive"});
        }
    } catch (e) {
        console.error("Exception while deleting image:", e);
    }
  };

  const onSubmitCombinedData: SubmitHandler<MetricValuesFormData> = async (formData) => {
    console.log("Form data submitted:", formData);
    const metricsToSave: AssessmentMetricValueInsert[] = [];

    // Process regular metrics and section/category images
    for (const m of formData.metrics) {
      const isCategoryOrSectionImageMetric = m.metric_identifier.includes('_image_overall');
      
      if (isCategoryOrSectionImageMetric) {
        // This is a category/section image placeholder metric
        let newImageUrl = m.image_url; // Existing URL
        const existingMetricData = existingMetricValuesData?.find(ev => ev.metric_identifier === m.metric_identifier);
        const oldImageUrl = existingMetricData?.image_url;

        if (m.image_file) { // New file uploaded
          if (oldImageUrl) await deleteImage(oldImageUrl);
          newImageUrl = await uploadImage(m.image_file, assessmentId, m.metric_identifier);
        } else if (m.image_url === null && oldImageUrl) { // Image explicitly removed
          await deleteImage(oldImageUrl);
          newImageUrl = null;
        }
        
        // Only save if there's an image_url or it's a new upload (image_file implies newImageUrl will be set)
        if (newImageUrl || m.image_file) {
          metricsToSave.push({
            assessment_id: assessmentId,
            metric_identifier: m.metric_identifier,
            label: m.label,
            category: m.category,
            entered_value: null, // Image placeholders don't have a numeric value
            measurement_type: m.measurement_type, // e.g., 'image_placeholder_category'
            notes: null,
            image_url: newImageUrl,
          });
        } else if (oldImageUrl && !newImageUrl) { // Image was removed, and we need to record its absence
           metricsToSave.push({ // This will effectively delete the image by saving null URL
            assessment_id: assessmentId,
            metric_identifier: m.metric_identifier,
            label: m.label,
            category: m.category,
            entered_value: null,
            measurement_type: m.measurement_type,
            notes: null,
            image_url: null, // Explicitly null
          });
        }


      } else {
        // This is a regular metric
        if (m.entered_value === null || m.entered_value === undefined) {
          // Skip saving if entered_value is null/undefined for a regular metric,
          // unless you intend to explicitly save nulls. For now, we skip.
          // This check might need refinement based on whether a metric with notes/image but no value is valid.
          // Since individual metrics no longer have images, this path is simpler.
          console.warn(`Skipping metric ${m.metric_identifier} due to null/undefined entered_value.`);
          continue;
        }
        metricsToSave.push({
          assessment_id: assessmentId,
          metric_identifier: m.metric_identifier,
          label: m.label,
          category: m.category,
          entered_value: m.entered_value, // Already preprocessed to number or null
          measurement_type: m.measurement_type,
          notes: m.notes,
          image_url: null, // No individual image for regular metrics
        });
      }
    }
    
    // Process site visit ratings (no individual images anymore)
    const ratingsToSave: AssessmentSiteVisitRatingInsert[] = formData.siteVisitRatings.map(svr => {
      const criterion = siteVisitCriteria.find(c => c.key === svr.criterion_key);
      if (!criterion || !svr.grade || svr.grade === '') return null; // Don't save if no grade

      const gradeDetail = criterion.grades.find(g => g.grade === svr.grade);
      return {
        assessment_id: assessmentId,
        criterion_key: svr.criterion_key as SiteVisitCriterionKey,
        rating_grade: svr.grade as SiteVisitRatingGrade,
        rating_description: gradeDetail?.description || '',
        notes: svr.notes || null,
      };
    }).filter(Boolean) as AssessmentSiteVisitRatingInsert[];

    console.log("Metrics to save:", metricsToSave);
    console.log("Ratings to save:", ratingsToSave);

    let metricsStepSuccess = false;
    if (metricsToSave.length > 0) {
      try {
        await metricsMutation.mutateAsync(metricsToSave);
        toast({ title: "Data Saved", description: "Metric values and section images have been successfully saved." });
        queryClient.invalidateQueries({ queryKey: ['assessmentMetricValues', assessmentId] });
        metricsStepSuccess = true;
      } catch (error) {
        // Error already toasted
        return;
      }
    } else {
      toast({ title: "Data", description: "No new metric values or section images to save." });
      metricsStepSuccess = true; // Proceed if no metrics were there to be saved
    }

    if (metricsStepSuccess) {
      if (ratingsToSave.length > 0) {
        siteVisitRatingsMutation.mutate(ratingsToSave);
      } else {
        toast({ title: 'Site Visit Ratings', description: 'No new site visit ratings to save.' });
        
        // Clear session storage and proceed even if no ratings
        sessionStorage.removeItem(getFormDataSessionKey(assessmentId));
        sessionStorage.removeItem(getImageDataSessionKey(assessmentId));
        
        onMetricsSubmitted(assessmentId); // If no ratings, submit directly
      }
    }
  };
  
  const metricsByCategory = metricFields.reduce((acc, field, index) => {
    // Cast field to include 'id' and other properties
    const typedField = field as unknown as { 
        id: string; 
        metric_identifier: string; 
        label: string; 
        category: string; 
        entered_value: number | null; 
        notes?: string | null; 
        image_url?: string | null;
        measurement_type?: string | null; // Added for image placeholders
    };

    // Skip image placeholder metrics from regular display
    if (typedField.metric_identifier.includes('_image_overall')) {
      return acc;
    }

    const originalMetricDef = metricSet?.user_custom_metrics_settings.find(m => m.metric_identifier === typedField.metric_identifier);
    const category = typedField.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ 
        ...typedField, 
        originalIndex: index, // This index refers to its position in the `metricFields` array from useFieldArray
        target_value: originalMetricDef?.target_value,
        higher_is_better: originalMetricDef?.higher_is_better
    });
    return acc;
  }, {} as Record<string, Array<{ id: string; originalIndex: number; metric_identifier: string; label: string; category: string; entered_value: number | null; notes?: string | null; image_url?: string | null; target_value?: number; higher_is_better?: boolean; measurement_type?: string | null }>>);

  const getCriterionDetails = (key: SiteVisitCriterionKey) => {
    return siteVisitCriteria.find(c => c.key === key);
  };

  if (isLoadingMetricSet || isLoadingExistingValues || isLoadingSiteVisitRatings) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading data...</p></div>;
  }

  if (metricSetError) {
    return <p className="text-destructive text-center p-4">Error loading metric set: {metricSetError.message}</p>;
  }
  
  const uniqueCategories = metricSet?.user_custom_metrics_settings
    ? [...new Set(metricSet.user_custom_metrics_settings.map(m => m.category))]
    : [];

  return (
    <TooltipProvider>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Step 3: Input Data for "{metricSet?.name || 'Assessment'}"</CardTitle>
          <CardDescription>
            Enter metric values and site visit ratings. Upload one image per section if needed. Assessment ID: {assessmentId}
            <br />
            <span className="text-xs text-muted-foreground">Your progress is automatically saved as you type.</span>
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit(onSubmitCombinedData)}>
          <CardContent className="space-y-8 pt-4">
            {/* Site Status Selector */}
            <div className="p-4 border rounded-md shadow-sm bg-primary/5">
              <Controller
                name="siteStatus"
                control={control}
                render={({ field }) => (
                  <SiteStatusSelector
                    value={field.value || 'Prospect'}
                    onValueChange={field.onChange}
                    label="Site Status"
                    showBadge={true}
                  />
                )}
              />
            </div>

            {/* Metric Sections with Category Image Upload */}
            {Object.entries(metricsByCategory).map(([category, categoryMetrics]) => {
              const categoryImageIdentifier = getCategorySpecificImageIdentifier(category);
              const imageMetricIndex = imageOnlyMetricIndices[categoryImageIdentifier];
              
              return (
                <div key={category} className="space-y-6 border-t pt-6 first:border-t-0 first:pt-0">
                  <h3 className="text-lg font-semibold text-primary">{category}</h3>
                  
                  {/* Individual Metrics within the category */}
                  {categoryMetrics.map((metricField) => (
                    <div key={metricField.id} className="p-4 border rounded-md shadow-sm bg-card">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div>
                          <Label htmlFor={`metrics.${metricField.originalIndex}.entered_value`} className="flex items-center">
                            {metricField.label}
                            <Tooltip delayDuration={100}>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 ml-1.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p>Target: {metricField.target_value ?? 'N/A'} ({metricField.higher_is_better ? "Higher is better" : "Lower is better"})</p>
                                {metricField.measurement_type && <p>Type: {metricField.measurement_type}</p>}
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          
                          {specificDropdownMetrics.includes(metricField.metric_identifier) ? (
                            <Controller
                              name={`metrics.${metricField.originalIndex}.entered_value`}
                              control={control}
                              render={({ field: controllerField }) => (
                                <Select
                                  value={controllerField.value !== null && controllerField.value !== undefined ? String(controllerField.value) : ""}
                                  onValueChange={(value) => controllerField.onChange(parseFloat(value))}
                                  disabled={isSubmitting || metricsMutation.isPending || siteVisitRatingsMutation.isPending}
                                >
                                  <SelectTrigger id={`metrics.${metricField.originalIndex}.entered_value`} className="mt-1">
                                    <SelectValue placeholder={`Select value for ${metricField.label}`} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {metricDropdownOptions[metricField.metric_identifier].map(option => (
                                      <SelectItem key={option.value} value={String(option.value)}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          ) : (
                            <Controller
                              name={`metrics.${metricField.originalIndex}.entered_value`}
                              control={control}
                              render={({ field: controllerField }) => (
                                <Input
                                  {...controllerField}
                                  id={`metrics.${metricField.originalIndex}.entered_value`}
                                  type="number"
                                  step="any"
                                  placeholder={`Enter value for ${metricField.label}`}
                                  className="mt-1"
                                  value={controllerField.value === null || controllerField.value === undefined ? '' : String(controllerField.value)}
                                  onChange={e => controllerField.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                                  disabled={isSubmitting || metricsMutation.isPending || siteVisitRatingsMutation.isPending}
                                />
                              )}
                            />
                          )}
                          {errors.metrics?.[metricField.originalIndex]?.entered_value && (
                            <p className="text-sm text-destructive mt-1">{errors.metrics[metricField.originalIndex]?.entered_value?.message as string}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor={`metrics.${metricField.originalIndex}.notes`}>Notes (Optional)</Label>
                          <Controller
                            name={`metrics.${metricField.originalIndex}.notes`}
                            control={control}
                            render={({ field: controllerField }) => (
                              <Textarea
                                {...controllerField}
                                id={`metrics.${metricField.originalIndex}.notes`}
                                placeholder="Any specific observations or context..."
                                className="mt-1"
                                value={controllerField.value ?? ''}
                                onChange={e => controllerField.onChange(e.target.value)}
                                disabled={isSubmitting || metricsMutation.isPending || siteVisitRatingsMutation.isPending}
                              />
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Category Image Upload Field - MOVED TO THE END OF THE CATEGORY SECTION */}
                  {imageMetricIndex !== undefined && metricFields[imageMetricIndex] && (
                    <div className="p-4 border rounded-md shadow-sm bg-secondary/30 mt-6"> {/* Added mt-6 for spacing */}
                      <Label htmlFor={`metrics.${imageMetricIndex}.image`}>{`Optional Image for ${category} Section`}</Label>
                      <Controller
                        name={`metrics.${imageMetricIndex}.image_file` as any} // Cast as any due to dynamic name
                        control={control}
                        render={() => (
                          <ImageUploadField
                            id={`metrics.${imageMetricIndex}.image`}
                            currentImageUrl={watch(`metrics.${imageMetricIndex}.image_url` as any)}
                            onFileChange={(file) => {
                              setValue(`metrics.${imageMetricIndex}.image_file` as any, file, { shouldValidate: true });
                              if (!file && watch(`metrics.${imageMetricIndex}.image_url` as any)) {
                                setValue(`metrics.${imageMetricIndex}.image_url` as any, null, { shouldValidate: true });
                              }
                            }}
                            onRemoveCurrentImage={() => {
                              setValue(`metrics.${imageMetricIndex}.image_url` as any, null, { shouldValidate: true });
                              setValue(`metrics.${imageMetricIndex}.image_file` as any, null, { shouldValidate: true });
                            }}
                            disabled={isSubmitting || metricsMutation.isPending || siteVisitRatingsMutation.isPending}
                          />
                        )}
                      />
                    </div>
                  )}
                </div>
              )
            })}
             {/* Display message if no custom metrics but site visit ratings exist */}
             {/* ... keep existing code ... */}

             {/* Site Visit Ratings Section */}
             {siteVisitRatingFields.length > 0 && (
               <div className="space-y-6 border-t pt-6 mt-8">
                 <div className="flex justify-between items-center">
                     <h3 className="text-lg font-semibold text-primary">Site Visit Ratings</h3>
                 </div>
                 
                 {/* Individual Site Visit Criteria */}
                 {siteVisitRatingFields.map((field, index) => {
                   const criterionDetails = getCriterionDetails(field.criterion_key as SiteVisitCriterionKey);
                   if (!criterionDetails) return null; 

                   return (
                     <div key={field.id} className="p-4 border rounded-md shadow-sm bg-card">
                       <h4 className="text-md font-semibold mb-1">{criterionDetails.label}</h4>
                       <p className="text-sm text-muted-foreground mb-3">{criterionDetails.description}</p>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                         <div className="md:col-span-1">
                           <Label htmlFor={`siteVisitRatings.${index}.grade`}>Grade</Label>
                           <Controller
                             name={`siteVisitRatings.${index}.grade`}
                             control={control}
                             render={({ field: controllerField }) => (
                               <Select
                                 value={controllerField.value || ''} 
                                 onValueChange={(value) => {
                                   controllerField.onChange(value === 'none' ? '' : value);
                                 }}
                                 disabled={isSubmitting || metricsMutation.isPending || siteVisitRatingsMutation.isPending}
                               >
                                 <SelectTrigger id={`siteVisitRatings.${index}.grade`} className="mt-1">
                                   <SelectValue placeholder="Select grade" />
                                 </SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="none"><em>No Grade</em></SelectItem>
                                   {criterionDetails.grades.map(grade => (
                                     <SelectItem key={grade.grade} value={grade.grade}>
                                       {grade.grade} - {grade.description}
                                     </SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                             )}
                           />
                         </div>
                         <div className="md:col-span-2">
                           <Label htmlFor={`siteVisitRatings.${index}.notes`}>Notes (Optional)</Label>
                           <Controller
                             name={`siteVisitRatings.${index}.notes`}
                             control={control}
                             render={({ field: controllerField }) => (
                               <Textarea
                                 {...controllerField}
                                 id={`siteVisitRatings.${index}.notes`}
                                 placeholder="Optional notes..."
                                 rows={2}
                                 className="mt-1"
                                 value={controllerField.value ?? ''}
                                 disabled={isSubmitting || metricsMutation.isPending || siteVisitRatingsMutation.isPending}
                               />
                             )}
                           />
                         </div>
                       </div>
                     </div>
                   );
                 })}

                 {/* Site Visit Section Image Upload - MOVED TO THE END OF THE SITE VISIT SECTION */}
                 {(() => {
                     const siteVisitImageMetricIndex = imageOnlyMetricIndices[SITE_VISIT_SECTION_IMAGE_IDENTIFIER];
                     if (siteVisitImageMetricIndex !== undefined && metricFields[siteVisitImageMetricIndex]) {
                     return (
                         <div className="p-4 border rounded-md shadow-sm bg-secondary/30 mt-6"> {/* Added mt-6 for spacing */}
                         <Label htmlFor={`metrics.${siteVisitImageMetricIndex}.image`}>Optional Image for Site Visit Section</Label>
                         <Controller
                             name={`metrics.${siteVisitImageMetricIndex}.image_file` as any}
                             control={control}
                             render={() => (
                             <ImageUploadField
                                 id={`metrics.${siteVisitImageMetricIndex}.image`}
                                 currentImageUrl={watch(`metrics.${siteVisitImageMetricIndex}.image_url` as any)}
                                 onFileChange={(file) => {
                                     setValue(`metrics.${siteVisitImageMetricIndex}.image_file` as any, file, { shouldValidate: true });
                                     if (!file && watch(`metrics.${siteVisitImageMetricIndex}.image_url` as any)) {
                                         setValue(`metrics.${siteVisitImageMetricIndex}.image_url` as any, null, { shouldValidate: true });
                                     }
                                 }}
                                 onRemoveCurrentImage={() => {
                                     setValue(`metrics.${siteVisitImageMetricIndex}.image_url` as any, null, { shouldValidate: true });
                                     setValue(`metrics.${siteVisitImageMetricIndex}.image_file` as any, null, { shouldValidate: true });
                                 }}
                                 disabled={isSubmitting || metricsMutation.isPending || siteVisitRatingsMutation.isPending}
                             />
                             )}
                         />
                         </div>
                     );
                     }
                     return null;
                 })()}
               </div>
             )}
          </CardContent>
          <CardFooter className="flex justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 border-t sticky bottom-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onBack} 
              disabled={isSubmitting || metricsMutation.isPending || siteVisitRatingsMutation.isPending || updateSiteStatusMutation.isPending}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || metricsMutation.isPending || siteVisitRatingsMutation.isPending || updateSiteStatusMutation.isPending || !user}
            >
              {(isSubmitting || metricsMutation.isPending || siteVisitRatingsMutation.isPending || updateSiteStatusMutation.isPending) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Finish Assessment
            </Button>
          </CardFooter>
        </form>
      </Card>
    </TooltipProvider>
  );
};

export default InputMetricValuesStep;
