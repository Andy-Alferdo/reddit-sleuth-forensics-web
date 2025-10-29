# Sequence Diagrams - Reddit Sleuth

## User Profiling Sequence

This diagram shows the complete flow when a user analyzes a Reddit profile.

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant RedditScraper as reddit-scraper<br/>Edge Function
    participant AnalyzeContent as analyze-content<br/>Edge Function
    participant RedditAPI as Reddit API
    participant LovableAI as Lovable AI<br/>(Gemini 2.5 Flash)
    participant Database as Supabase DB
    
    User->>Frontend: Enter username & click scrape
    Frontend->>RedditScraper: POST /reddit-scraper<br/>{username, type: "user"}
    
    RedditScraper->>RedditAPI: Authenticate (OAuth2)
    RedditAPI-->>RedditScraper: Access Token
    
    RedditScraper->>RedditAPI: GET /user/{username}/about
    RedditAPI-->>RedditScraper: User Profile Data
    
    RedditScraper->>RedditAPI: GET /user/{username}/submitted
    RedditAPI-->>RedditScraper: Posts Data
    
    RedditScraper->>RedditAPI: GET /user/{username}/comments
    RedditAPI-->>RedditScraper: Comments Data
    
    RedditScraper-->>Frontend: User Data + Posts + Comments
    
    Frontend->>AnalyzeContent: POST /analyze-content<br/>{posts, comments, type: "user"}
    
    AnalyzeContent->>LovableAI: Analyze Sentiment<br/>(per-item + overall)
    LovableAI-->>AnalyzeContent: Sentiment Results + XAI
    
    AnalyzeContent->>LovableAI: Extract Locations
    LovableAI-->>AnalyzeContent: Location Data
    
    AnalyzeContent->>LovableAI: Identify Behavior Patterns
    LovableAI-->>AnalyzeContent: Pattern Analysis
    
    AnalyzeContent-->>Frontend: Analysis Results<br/>(postSentiments, commentSentiments,<br/>locations, patterns)
    
    Frontend->>Database: Store Analysis Results
    Database-->>Frontend: Confirmation
    
    Frontend->>User: Display User Profile<br/>with Sentiment Charts & XAI
```

## Content Monitoring Sequence

This diagram shows the real-time monitoring workflow.

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant RedditScraper as reddit-scraper<br/>Edge Function
    participant AnalyzeContent as analyze-content<br/>Edge Function
    participant RedditAPI as Reddit API
    participant LovableAI as Lovable AI
    participant Database as Supabase DB
    
    User->>Frontend: Configure keywords & search
    Frontend->>Database: Save keywords
    Database-->>Frontend: Confirmation
    
    loop Every Monitoring Interval
        Frontend->>RedditScraper: POST /reddit-scraper<br/>{query: keywords, type: "search"}
        
        RedditScraper->>RedditAPI: Authenticate
        RedditAPI-->>RedditScraper: Access Token
        
        RedditScraper->>RedditAPI: GET /search<br/>?q=keywords&sort=new
        RedditAPI-->>RedditScraper: Search Results<br/>(Posts + Comments)
        
        RedditScraper-->>Frontend: Scraped Content
        
        Frontend->>AnalyzeContent: POST /analyze-content<br/>{posts, comments}
        
        AnalyzeContent->>LovableAI: Analyze Content
        LovableAI-->>AnalyzeContent: Analysis Results
        
        AnalyzeContent-->>Frontend: Processed Results
        
        Frontend->>Database: Store monitoring results
        Database-->>Frontend: Confirmation
        
        Frontend->>User: Display updates<br/>(real-time)
    end
```

## Authentication Sequence

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant SupabaseAuth as Supabase Auth
    participant Database as Supabase DB
    
    User->>Frontend: Enter credentials
    Frontend->>SupabaseAuth: signInWithPassword()
    
    alt Successful Login
        SupabaseAuth-->>Frontend: Session + JWT Token
        Frontend->>Database: Fetch user role
        Database-->>Frontend: User role data
        Frontend->>User: Redirect to Dashboard
    else Failed Login
        SupabaseAuth-->>Frontend: Error
        Frontend->>User: Display error message
    end
```
