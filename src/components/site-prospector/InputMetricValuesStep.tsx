import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowRight, ArrowLeft, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTargetMetricSetById } from '@/services/targetMetricsService';
import { saveAssessmentMetricValues, getAssessmentMetricValues, getSiteVisitRatings, saveSiteVisitRatings, updateSiteStatus, getAssessmentDetails } from '@/services/siteAssessmentService';
import { TargetMetricSet } from '@/types/targetMetrics';
import { AssessmentMetricValueInsert, siteVisitCriteria, SiteVisitCriterionKey, SiteVisitRatingGrade, AssessmentSiteVisitRatingInsert, AssessmentMetricValue } from '@/types/siteAssessmentTypes';
import { supabase } from '@/integrations/supabase/client';
import SiteStatusSelector from './SiteStatusSelector';
import { TooltipProvider } from "@/components/ui/tooltip";
import CategorySection from './metric-input/CategorySection';
import SiteVisitSection from './metric-input/SiteVisitSection';

// Import shared config
import { sortCategoriesByOrder } from '@/config/targetMetricsConfig';
import { specificDropdownMetrics } from '@/config/metricDisplayConfig';

// Constants for special image metric identifiers
const SITE_VISIT_SECTION_IMAGE_IDENTIFIER = 'site_visit_section_image_overall';
const getCategorySpecificImageIdentifier = (category: string) => `category_${category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_image_overall`;

// Session storage keys for form persistence
const getFormDataSessionKey = (assessmentId: string) => `inputMetricValues_formData_${assessmentId}`;
const getImageDataSessionKey = (assessmentId: string) => `inputMetricValues_imageData_${assessmentId}`;

// Define a type for the image-only metric objects we'll manage in the form state
type ImageOnlyFormMetric = {
  id: string;
  metric_identifier: string;
  label: string;
  category: string;
  image_url: string | null;
  image_file: File | null;
  entered_value: number;
  measurement_type: string | null;
  notes: string | null;
};

const metricValueSchema = z.object({
  metric_identifier: z.string(),
  label: z.string(),
  category: z.string(),
  entered_value: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : parseFloat(String(val))),
    z.number({invalid_type_error: "Value must be a number"}).nullable()
  ),
  measurement_type: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  image_file: z.instanceof(File).optional().nullable(),
});

const siteVisitRatingItemSchema = z.object({
  criterion_key: z.string(),
  grade: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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
      console.log('[InputMetricValuesStep] Fetching metric set:', targetMetricSetId);
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

  const { fields: metricFields, replace: replaceMetrics } = useFieldArray({
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

  // Save form data to session storage whenever form data changes - with debouncing
  useEffect(() => {
    const subscription = watch((value) => {
      const timeoutId = setTimeout(() => {
        try {
          const serializableData = {
            metrics: value.metrics?.map(metric => ({
              ...metric,
              image_file: null,
            })) || [],
            siteVisitRatings: value.siteVisitRatings || [],
            siteStatus: value.siteStatus || 'Prospect',
          };
          
          sessionStorage.setItem(getFormDataSessionKey(assessmentId), JSON.stringify(serializableData));
          console.log('Form data saved to session storage:', serializableData);
        } catch (error) {
          console.warn('Failed to save form data to session storage:', error);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    });
    
    return () => subscription.unsubscribe();
  }, [watch, assessmentId]);

  // Clear session storage on completion
  const clearSessionStorageOnCompletion = () => {
    sessionStorage.removeItem(getFormDataSessionKey(assessmentId));
    sessionStorage.removeItem(getImageDataSessionKey(assessmentId));
    console.log('Session storage cleared after assessment completion');
  };

  // Load saved form data from session storage
  const loadSavedFormData = () => {
    try {
      const savedDataJson = sessionStorage.getItem(getFormDataSessionKey(assessmentId));
      if (savedDataJson) {
        const savedData = JSON.parse(savedDataJson) as Partial<MetricValuesFormData>;
        console.log('Loaded saved form data from session storage:', savedData);
        return savedData;
      }
    } catch (error) {
      console.warn('Failed to load saved form data from session storage:', error);
    }
    return null;
  };

  // Initialize form data
  useEffect(() => {
    console.log('[InputMetricValuesStep] useEffect triggered - metricSet:', metricSet);
    console.log('[InputMetricValuesStep] Available metrics:', metricSet?.user_custom_metrics_settings?.length || 0);
    
    const savedFormData = loadSavedFormData();
    const allMetricsToSet: any[] = [];
    const currentImageOnlyIndices: Record<string, number> = {};

    // Process regular metrics from metricSet
    if (metricSet?.user_custom_metrics_settings && metricSet.user_custom_metrics_settings.length > 0) {
      console.log('[InputMetricValuesStep] Processing metrics from metric set:', metricSet.user_custom_metrics_settings);
      
      metricSet.user_custom_metrics_settings.forEach(metric => {
        const existingValue = existingMetricValuesData?.find(ev => ev.metric_identifier === metric.metric_identifier);
        const savedMetricData = savedFormData?.metrics?.find(sm => sm.metric_identifier === metric.metric_identifier);
        
        let defaultValue: number | null;
        if (savedMetricData?.entered_value !== undefined && savedMetricData?.entered_value !== null) {
          defaultValue = savedMetricData.entered_value;
          console.log(`Using saved form data for ${metric.metric_identifier}:`, defaultValue);
        } else if (existingValue?.entered_value !== undefined && existingValue?.entered_value !== null) {
          defaultValue = existingValue.entered_value;
          console.log(`Using database value for ${metric.metric_identifier}:`, defaultValue);
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
          image_url: null,
          image_file: null,
        });
      });

      // Process category-specific images
      const categories = [...new Set(metricSet.user_custom_metrics_settings.map(m => m.category))];
      console.log('[InputMetricValuesStep] Processing categories for images:', categories);

      categories.forEach(category => {
        const identifier = getCategorySpecificImageIdentifier(category);
        const existingImageMetric = existingMetricValuesData?.find(ev => ev.metric_identifier === identifier);
        currentImageOnlyIndices[identifier] = allMetricsToSet.length;
        allMetricsToSet.push({
          metric_identifier: identifier,
          label: `${category} Section Image`,
          category: category,
          entered_value: null,
          measurement_type: 'image_placeholder_category',
          notes: null,
          image_url: existingImageMetric?.image_url ?? null,
          image_file: null,
        });
      });
    } else {
      console.log('[InputMetricValuesStep] No custom metrics found in metric set');
    }

    // Process Site Visit section image
    const siteVisitImageIdentifier = SITE_VISIT_SECTION_IMAGE_IDENTIFIER;
    const existingSiteVisitSectionImage = existingMetricValuesData?.find(ev => ev.metric_identifier === siteVisitImageIdentifier);
    currentImageOnlyIndices[siteVisitImageIdentifier] = allMetricsToSet.length;
    allMetricsToSet.push({
      metric_identifier: siteVisitImageIdentifier,
      label: 'Site Visit Section Image',
      category: 'SiteVisitSectionImages',
      entered_value: null,
      measurement_type: 'image_placeholder_section',
      notes: null,
      image_url: existingSiteVisitSectionImage?.image_url ?? null,
      image_file: null,
    });
    
    console.log('[InputMetricValuesStep] Final metrics array length:', allMetricsToSet.length);
    replaceMetrics(allMetricsToSet);
    setImageOnlyMetricIndices(currentImageOnlyIndices);

    if (siteVisitCriteria) {
      const initialSiteVisitRatingsData = siteVisitCriteria.map(criterion => {
        const existingRating = existingSiteVisitRatingsData?.find(r => r.criterion_key === criterion.key);
        const savedRatingData = savedFormData?.siteVisitRatings?.find(sr => sr.criterion_key === criterion.key);
        
        return {
          criterion_key: criterion.key,
          grade: savedRatingData?.grade ?? existingRating?.rating_grade ?? '',
          notes: savedRatingData?.notes ?? existingRating?.notes ?? '',
        };
      });
      replaceSiteVisitRatings(initialSiteVisitRatingsData);
    }

    const siteStatus = savedFormData?.siteStatus ?? currentAssessment?.site_status ?? 'Prospect';
    setValue('siteStatus', siteStatus);

  }, [metricSet, existingMetricValuesData, existingSiteVisitRatingsData, replaceMetrics, replaceSiteVisitRatings, setValue, currentAssessment?.site_status]);

  const metricsMutation = useMutation({
    mutationFn: (data: AssessmentMetricValueInsert[]) => {
        if (!user?.id) throw new Error('User not authenticated');
        const validData = data.filter(d => 
            d.entered_value !== null || 
            d.metric_identifier.includes('_image_overall') || 
            d.metric_identifier === SITE_VISIT_SECTION_IMAGE_IDENTIFIER
        );
        if (validData.length === 0) return Promise.resolve([]);
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
      clearSessionStorageOnCompletion();
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

    for (const m of formData.metrics) {
      const isCategoryOrSectionImageMetric = m.metric_identifier.includes('_image_overall');
      
      if (isCategoryOrSectionImageMetric) {
        let newImageUrl = m.image_url;
        const existingMetricData = existingMetricValuesData?.find(ev => ev.metric_identifier === m.metric_identifier);
        const oldImageUrl = existingMetricData?.image_url;

        if (m.image_file) {
          if (oldImageUrl) await deleteImage(oldImageUrl);
          newImageUrl = await uploadImage(m.image_file, assessmentId, m.metric_identifier);
        } else if (m.image_url === null && oldImageUrl) {
          await deleteImage(oldImageUrl);
          newImageUrl = null;
        }
        
        if (newImageUrl || m.image_file) {
          metricsToSave.push({
            assessment_id: assessmentId,
            metric_identifier: m.metric_identifier,
            label: m.label,
            category: m.category,
            entered_value: null,
            measurement_type: m.measurement_type,
            notes: null,
            image_url: newImageUrl,
          });
        } else if (oldImageUrl && !newImageUrl) {
           metricsToSave.push({
            assessment_id: assessmentId,
            metric_identifier: m.metric_identifier,
            label: m.label,
            category: m.category,
            entered_value: null,
            measurement_type: m.measurement_type,
            notes: null,
            image_url: null,
          });
        }
      } else {
        if (m.entered_value === null || m.entered_value === undefined) {
          console.warn(`Skipping metric ${m.metric_identifier} due to null/undefined entered_value.`);
          continue;
        }
        metricsToSave.push({
          assessment_id: assessmentId,
          metric_identifier: m.metric_identifier,
          label: m.label,
          category: m.category,
          entered_value: m.entered_value,
          measurement_type: m.measurement_type,
          notes: m.notes,
          image_url: null,
        });
      }
    }
    
    const ratingsToSave: AssessmentSiteVisitRatingInsert[] = formData.siteVisitRatings.map(svr => {
      const criterion = siteVisitCriteria.find(c => c.key === svr.criterion_key);
      if (!criterion || !svr.grade || svr.grade === '') return null;

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
        return;
      }
    } else {
      toast({ title: "Data", description: "No new metric values or section images to save." });
      metricsStepSuccess = true;
    }

    if (metricsStepSuccess) {
      if (ratingsToSave.length > 0) {
        siteVisitRatingsMutation.mutate(ratingsToSave);
      } else {
        toast({ title: 'Site Visit Ratings', description: 'No new site visit ratings to save.' });
        clearSessionStorageOnCompletion();
        onMetricsSubmitted(assessmentId);
      }
    }
  };
  
  const metricsByCategory = metricFields.reduce((acc, field, index) => {
    const typedField = field as unknown as { 
        id: string; 
        metric_identifier: string; 
        label: string; 
        category: string; 
        entered_value: number | null; 
        notes?: string | null; 
        image_url?: string | null;
        measurement_type?: string | null;
    };

    if (typedField.metric_identifier.includes('_image_overall')) {
      return acc;
    }

    const originalMetricDef = metricSet?.user_custom_metrics_settings?.find(m => m.metric_identifier === typedField.metric_identifier);
    const category = typedField.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ 
        ...typedField, 
        originalIndex: index,
        target_value: originalMetricDef?.target_value,
        higher_is_better: originalMetricDef?.higher_is_better
    });
    return acc;
  }, {} as Record<string, Array<{ id: string; originalIndex: number; metric_identifier: string; label: string; category: string; entered_value: number | null; notes?: string | null; image_url?: string | null; target_value?: number; higher_is_better?: boolean; measurement_type?: string | null }>>);

  const sortedCategories = sortCategoriesByOrder(Object.keys(metricsByCategory));

  // Type the siteVisitRatingFields properly
  const typedSiteVisitRatingFields = siteVisitRatingFields.map(field => ({
    id: field.id,
    criterion_key: (field as any).criterion_key || '',
    grade: (field as any).grade || '',
    notes: (field as any).notes || '',
  }));

  console.log('[InputMetricValuesStep] Render check:', {
    metricSetLoaded: !!metricSet,
    customMetricsCount: metricSet?.user_custom_metrics_settings?.length || 0,
    categoriesCount: sortedCategories.length,
    siteVisitRatingsCount: siteVisitRatingFields.length
  });

  // Display message if no custom metrics but site visit ratings exist
  if ((!metricSet?.user_custom_metrics_settings || metricSet?.user_custom_metrics_settings.length === 0) && siteVisitRatingFields.length > 0) {
    console.log('[InputMetricValuesStep] Showing Site Visit only view');
    return (
      <TooltipProvider>
        <Card className="w-full max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Step 3: Input Data for "{metricSet?.name || 'Assessment'}"</CardTitle>
            <CardDescription>
              No custom metrics are defined for this assessment. Please input site visit ratings. Assessment ID: {assessmentId}
              <br />
              <span className="text-xs text-muted-foreground">Your progress is automatically saved as you type and will be restored if you navigate away.</span>
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

               {/* Site Visit Ratings Section */}
               <SiteVisitSection
                 siteVisitRatingFields={typedSiteVisitRatingFields}
                 siteVisitImageMetricIndex={imageOnlyMetricIndices[SITE_VISIT_SECTION_IMAGE_IDENTIFIER]}
                 control={control}
                 watch={watch}
                 setValue={setValue}
                 disabled={isSubmitting || metricsMutation.isPending || siteVisitRatingsMutation.isPending}
               />
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
  }

  if (isLoadingMetricSet || isLoadingExistingValues || isLoadingSiteVisitRatings) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading data...</p></div>;
  }

  if (metricSetError) {
    return <p className="text-destructive text-center p-4">Error loading metric set: {metricSetError.message}</p>;
  }
  
  console.log('[InputMetricValuesStep] Rendering full assessment view with categories:', sortedCategories);
  
  return (
    <TooltipProvider>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Step 3: Input Data for "{metricSet?.name || 'Assessment'}"</CardTitle>
          <CardDescription>
            Enter metric values and site visit ratings. Upload one image per section if needed. Assessment ID: {assessmentId}
            <br />
            <span className="text-xs text-muted-foreground">Your progress is automatically saved as you type and will be restored if you navigate away.</span>
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

            {/* Metric Sections with Category Image Upload - Now using sorted categories */}
            {sortedCategories.map((category) => {
              const categoryMetrics = metricsByCategory[category];
              const categoryImageIdentifier = getCategorySpecificImageIdentifier(category);
              const imageMetricIndex = imageOnlyMetricIndices[categoryImageIdentifier];
              
              return (
                <CategorySection
                  key={category}
                  category={category}
                  categoryMetrics={categoryMetrics}
                  imageMetricIndex={imageMetricIndex}
                  control={control}
                  errors={errors}
                  watch={watch}
                  setValue={setValue}
                  disabled={isSubmitting || metricsMutation.isPending || siteVisitRatingsMutation.isPending}
                />
              );
            })}

             {/* Site Visit Ratings Section */}
             <SiteVisitSection
               siteVisitRatingFields={typedSiteVisitRatingFields}
               siteVisitImageMetricIndex={imageOnlyMetricIndices[SITE_VISIT_SECTION_IMAGE_IDENTIFIER]}
               control={control}
               watch={watch}
               setValue={setValue}
               disabled={isSubmitting || metricsMutation.isPending || siteVisitRatingsMutation.isPending}
             />
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
