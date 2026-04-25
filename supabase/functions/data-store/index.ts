import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  operation: string;
  data?: any;
  caseId?: string;
  filters?: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user from auth header if present
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    const body: RequestBody = await req.json();
    const { operation, data, caseId, filters } = body;

    console.log(`[data-store] Operation: ${operation}, CaseId: ${caseId}, UserId: ${userId}`);

    let result: any = null;

    switch (operation) {
      // ============ CASE OPERATIONS ============
      case 'createCase': {
        if (!userId) {
          throw new Error('Authentication required to create a case');
        }
        
        // Hash password if sensitive case
        let passwordHash = null;
        if (data.isSensitive && data.casePassword) {
          const { data: hashResult } = await supabase.rpc('hash_case_password', {
            p_password: data.casePassword
          });
          passwordHash = hashResult;
        }
        
        const { data: caseData, error } = await supabase
          .from('investigation_cases')
          .insert({
            case_number: data.caseNumber,
            case_name: data.caseName,
            description: data.description,
            lead_investigator: data.leadInvestigator,
            department: data.department,
            priority: data.priority,
            status: 'active',
            created_by: userId,
            is_sensitive: data.isSensitive || false,
            case_password_hash: passwordHash,
            cache_duration_days: data.cacheDurationDays || 30,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        // Log audit event
        await supabase.rpc('log_audit_event', {
          p_user_id: userId,
          p_action_type: 'case_create',
          p_resource_type: 'case',
          p_resource_id: caseData.id,
          p_details: { case_number: data.caseNumber, is_sensitive: data.isSensitive }
        });
        
        result = caseData;
        console.log(`[data-store] Case created: ${caseData.id}`);
        break;
      }

      case 'getCases': {
        const { data: cases, error } = await supabase
          .from('investigation_cases')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        result = cases;
        break;
      }

      case 'getCase': {
        const { data: caseData, error } = await supabase
          .from('investigation_cases')
          .select('*')
          .eq('id', caseId)
          .maybeSingle();
        
        if (error) throw error;
        result = caseData;
        break;
      }

      case 'updateCase': {
        const { data: caseData, error } = await supabase
          .from('investigation_cases')
          .update({
            case_name: data.caseName,
            description: data.description,
            lead_investigator: data.leadInvestigator,
            department: data.department,
            priority: data.priority,
            status: data.status,
          })
          .eq('id', caseId)
          .select()
          .single();
        
        if (error) throw error;
        result = caseData;
        break;
      }

      // ============ POSTS OPERATIONS ============
      case 'savePosts': {
        if (!caseId || !data?.posts) throw new Error('caseId and posts required');

        const source = data.source || null;
        const rawPosts = Array.isArray(data.posts) ? data.posts : [];
        const postsToInsert = rawPosts
          .filter((post: any) => post && (post.id || post.post_id))
          .map((post: any) => ({
            case_id: caseId,
            post_id: String(post.id || post.post_id),
            author: post.author ?? null,
            subreddit: post.subreddit ?? null,
            title: post.title ?? null,
            content: post.selftext ?? post.content ?? null,
            score: typeof post.score === 'number' ? post.score : null,
            num_comments: typeof post.num_comments === 'number' ? post.num_comments : null,
            permalink: post.permalink ?? null,
            created_utc: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null,
            metadata: { ...(post.metadata || {}), ...(source ? { source } : {}) },
            sentiment: post.sentiment ?? null,
            sentiment_explanation: post.sentimentExplanation ?? post.sentiment_explanation ?? null,
          }));

        if (postsToInsert.length === 0) {
          result = { inserted: 0, skipped: rawPosts.length };
          console.log(`[data-store] savePosts: nothing to insert (received ${rawPosts.length})`);
          break;
        }

        const { data: posts, error } = await supabase
          .from('reddit_posts')
          .upsert(postsToInsert, { onConflict: 'case_id,post_id' })
          .select('id');

        if (error) {
          console.error('[data-store] savePosts error:', error);
          throw error;
        }
        result = { inserted: posts?.length || 0, source };
        console.log(`[data-store] Saved ${posts?.length || 0} posts (source=${source})`);
        break;
      }

      case 'getPosts': {
        let query = supabase.from('reddit_posts').select('*');
        
        if (caseId) query = query.eq('case_id', caseId);
        if (filters?.author) query = query.eq('author', filters.author);
        if (filters?.subreddit) query = query.eq('subreddit', filters.subreddit);
        
        const { data: posts, error } = await query.order('collected_at', { ascending: false });
        
        if (error) throw error;
        result = posts;
        break;
      }

      // ============ COMMENTS OPERATIONS ============
      case 'saveComments': {
        if (!caseId || !data?.comments) throw new Error('caseId and comments required');

        const source = data.source || null;
        const rawComments = Array.isArray(data.comments) ? data.comments : [];
        const commentsToInsert = rawComments
          .filter((comment: any) => comment && (comment.id || comment.comment_id))
          .map((comment: any) => ({
            case_id: caseId,
            comment_id: String(comment.id || comment.comment_id),
            author: comment.author ?? null,
            subreddit: comment.subreddit ?? null,
            body: comment.body ?? null,
            score: typeof comment.score === 'number' ? comment.score : null,
            link_title: comment.link_title ?? null,
            permalink: comment.permalink ?? null,
            created_utc: comment.created_utc ? new Date(comment.created_utc * 1000).toISOString() : null,
            metadata: { ...(comment.metadata || {}), ...(source ? { source } : {}) },
            sentiment: comment.sentiment ?? null,
            sentiment_explanation: comment.sentimentExplanation ?? comment.sentiment_explanation ?? null,
          }));

        if (commentsToInsert.length === 0) {
          result = { inserted: 0, skipped: rawComments.length };
          console.log(`[data-store] saveComments: nothing to insert (received ${rawComments.length})`);
          break;
        }

        const { data: comments, error } = await supabase
          .from('reddit_comments')
          .upsert(commentsToInsert, { onConflict: 'case_id,comment_id' })
          .select('id');

        if (error) {
          console.error('[data-store] saveComments error:', error);
          throw error;
        }
        result = { inserted: comments?.length || 0, source };
        console.log(`[data-store] Saved ${comments?.length || 0} comments (source=${source})`);
        break;
      }

      case 'getComments': {
        let query = supabase.from('reddit_comments').select('*');
        
        if (caseId) query = query.eq('case_id', caseId);
        if (filters?.author) query = query.eq('author', filters.author);
        if (filters?.subreddit) query = query.eq('subreddit', filters.subreddit);
        
        const { data: comments, error } = await query.order('collected_at', { ascending: false });
        
        if (error) throw error;
        result = comments;
        break;
      }

      // ============ USER PROFILES OPERATIONS ============
      case 'saveUserProfile': {
        if (!caseId || !data) throw new Error('caseId and profile data required');
        
        const { data: profile, error } = await supabase
          .from('user_profiles_analyzed')
          .insert({
            case_id: caseId,
            username: data.username,
            account_age: data.accountAge,
            total_karma: data.totalKarma,
            post_karma: data.postKarma,
            comment_karma: data.commentKarma,
            active_subreddits: data.activeSubreddits,
            activity_pattern: data.activityPattern,
            sentiment_analysis: data.sentimentAnalysis,
            post_sentiments: data.postSentiments,
            comment_sentiments: data.commentSentiments,
            location_indicators: data.locationIndicators,
            behavior_patterns: data.behaviorPatterns,
            word_cloud: data.wordCloud,
          })
          .select()
          .single();
        
        if (error) throw error;
        result = profile;
        console.log(`[data-store] Saved profile for ${data.username}`);
        break;
      }

      case 'getUserProfiles': {
        let query = supabase.from('user_profiles_analyzed').select('*');
        
        if (caseId) query = query.eq('case_id', caseId);
        if (filters?.username) query = query.eq('username', filters.username);
        
        const { data: profiles, error } = await query.order('analyzed_at', { ascending: false });
        
        if (error) throw error;
        result = profiles;
        break;
      }

      // ============ MONITORING SESSIONS ============
      case 'saveMonitoringSession': {
        if (!caseId || !data) throw new Error('caseId and session data required');
        
        const { data: session, error } = await supabase
          .from('monitoring_sessions')
          .insert({
            case_id: caseId,
            search_type: data.searchType,
            target_name: data.targetName,
            profile_data: data.profileData,
            activities: data.activities,
            word_cloud_data: data.wordCloudData,
            started_at: data.startedAt,
            ended_at: data.endedAt ?? null,
            new_activity_count: data.newActivityCount,
          })
          .select()
          .single();
        
        if (error) throw error;
        result = session;
        console.log(`[data-store] Saved monitoring session for ${data.targetName}`);
        break;
      }

      case 'updateMonitoringSession': {
        if (!data?.id) throw new Error('session id required');
        const updatePayload: Record<string, unknown> = {};
        if (data.profileData !== undefined) updatePayload.profile_data = data.profileData;
        if (data.activities !== undefined) updatePayload.activities = data.activities;
        if (data.wordCloudData !== undefined) updatePayload.word_cloud_data = data.wordCloudData;
        if (data.newActivityCount !== undefined) updatePayload.new_activity_count = data.newActivityCount;
        if (data.endedAt !== undefined) updatePayload.ended_at = data.endedAt;

        const { data: session, error } = await supabase
          .from('monitoring_sessions')
          .update(updatePayload)
          .eq('id', data.id)
          .select()
          .single();

        if (error) throw error;
        result = session;
        console.log(`[data-store] Updated monitoring session ${data.id}`);
        break;
      }

      case 'getMonitoringSessions': {
        let query = supabase.from('monitoring_sessions').select('*');
        
        if (caseId) query = query.eq('case_id', caseId);
        
        const { data: sessions, error } = await query.order('ended_at', { ascending: false });
        
        if (error) throw error;
        result = sessions;
        break;
      }

      // ============ ANALYSIS RESULTS ============
      case 'saveAnalysis': {
        if (!caseId || !data) throw new Error('caseId and analysis data required');
        
        const { data: analysis, error } = await supabase
          .from('analysis_results')
          .insert({
            case_id: caseId,
            analysis_type: data.analysisType,
            target: data.target,
            result_data: data.resultData,
            sentiment_data: data.sentimentData,
          })
          .select()
          .single();
        
        if (error) throw error;
        result = analysis;
        console.log(`[data-store] Saved ${data.analysisType} analysis for ${data.target}`);
        break;
      }

      case 'getAnalyses': {
        let query = supabase.from('analysis_results').select('*');
        
        if (caseId) query = query.eq('case_id', caseId);
        if (filters?.analysisType) query = query.eq('analysis_type', filters.analysisType);
        
        const { data: analyses, error } = await query.order('analyzed_at', { ascending: false });
        
        if (error) throw error;
        result = analyses;
        break;
      }

      // ============ REPORTS ============
      case 'saveReport': {
        if (!caseId || !data) throw new Error('caseId and report data required');
        
        const { data: report, error } = await supabase
          .from('investigation_reports')
          .insert({
            case_id: caseId,
            report_type: data.reportType,
            export_format: data.exportFormat,
            report_data: data.reportData,
            selected_modules: data.selectedModules,
            generated_by: userId,
          })
          .select()
          .single();
        
        if (error) throw error;
        result = report;
        console.log(`[data-store] Saved report for case ${caseId}`);
        break;
      }

      case 'getReports': {
        let query = supabase.from('investigation_reports').select('*');
        
        if (caseId) query = query.eq('case_id', caseId);
        
        const { data: reports, error } = await query.order('generated_at', { ascending: false });
        
        if (error) throw error;
        result = reports;
        break;
      }

      // ============ FULL CASE DATA ============
      case 'getCaseFullData': {
        if (!caseId) throw new Error('caseId required');
        
        const [
          { data: caseData },
          { data: posts },
          { data: comments },
          { data: profiles },
          { data: sessions },
          { data: analyses },
          { data: reports },
        ] = await Promise.all([
          supabase.from('investigation_cases').select('*').eq('id', caseId).maybeSingle(),
          supabase.from('reddit_posts').select('*').eq('case_id', caseId),
          supabase.from('reddit_comments').select('*').eq('case_id', caseId),
          supabase.from('user_profiles_analyzed').select('*').eq('case_id', caseId),
          supabase.from('monitoring_sessions').select('*').eq('case_id', caseId),
          supabase.from('analysis_results').select('*').eq('case_id', caseId),
          supabase.from('investigation_reports').select('*').eq('case_id', caseId),
        ]);

        result = {
          case: caseData,
          posts,
          comments,
          profiles,
          sessions,
          analyses,
          reports,
        };
        break;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[data-store] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
