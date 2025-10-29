# Sequence Diagrams - Reddit Sleuth

## User Profiling Sequence

This diagram shows the complete flow when a user analyzes a Reddit profile.

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Scraper as Reddit Scraper Function
    participant Analyzer as Content Analyzer Function
    participant Reddit as Reddit API
    participant AI as Gemini AI
    participant DB as Database
    
    User->>Frontend: Enter username
    Frontend->>Scraper: Request user data
    Scraper->>Reddit: Authenticate OAuth2
    Reddit-->>Scraper: Access token
    Scraper->>Reddit: Fetch profile, posts, comments
    Reddit-->>Scraper: User data
    Scraper-->>Frontend: Return scraped data
    
    Frontend->>Analyzer: Send posts and comments
    Analyzer->>AI: Analyze sentiment with XAI
    AI-->>Analyzer: Sentiment results
    Analyzer->>AI: Extract locations
    AI-->>Analyzer: Location data
    Analyzer->>AI: Identify patterns
    AI-->>Analyzer: Behavior patterns
    Analyzer-->>Frontend: Complete analysis
    
    Frontend->>DB: Store results
    Frontend->>User: Display charts and tables
```

## Content Monitoring Sequence

This diagram shows the real-time monitoring workflow.

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Scraper as Reddit Scraper
    participant Analyzer as Content Analyzer
    participant Reddit as Reddit API
    participant AI as Gemini AI
    participant DB as Database
    
    User->>Frontend: Configure keywords
    Frontend->>DB: Save keywords
    
    loop Monitoring Interval
        Frontend->>Scraper: Search keywords
        Scraper->>Reddit: Search API
        Reddit-->>Scraper: Results
        Scraper-->>Frontend: Posts and comments
        
        Frontend->>Analyzer: Analyze content
        Analyzer->>AI: Sentiment analysis
        AI-->>Analyzer: Results
        Analyzer-->>Frontend: Analysis complete
        
        Frontend->>DB: Store results
        Frontend->>User: Display updates
    end
```

## Authentication Sequence

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Auth as Authentication Service
    participant DB as Database
    
    User->>Frontend: Enter email and password
    Frontend->>Auth: Sign in request
    
    alt Success
        Auth-->>Frontend: Session token
        Frontend->>DB: Fetch user role
        DB-->>Frontend: User data
        Frontend->>User: Redirect to dashboard
    else Failure
        Auth-->>Frontend: Error message
        Frontend->>User: Show error
    end
```
