# Class Diagram - Reddit Sleuth

This diagram shows the main classes and their relationships in simplified form.

```mermaid
classDiagram
    class App {
        +routes
        +render()
    }
    
    class UserProfiling {
        +username
        +profileData
        +postSentiments[]
        +commentSentiments[]
        +handleScrape()
    }
    
    class CommunityAnalysis {
        +subreddit
        +communityData
        +handleScrape()
    }
    
    class Monitoring {
        +keywords[]
        +monitoringData[]
        +alerts[]
        +startMonitoring()
    }
    
    class UserProfile {
        +username
        +karma
        +posts[]
        +comments[]
        +sentimentBreakdown
    }
    
    class SentimentItem {
        +text
        +sentiment
        +explanation
    }
    
    class Post {
        +id
        +title
        +content
        +score
    }
    
    class Comment {
        +id
        +body
        +score
    }
    
    class RedditScraper {
        +authenticate()
        +fetchUserData()
        +searchContent()
    }
    
    class ContentAnalyzer {
        +analyzeSentiment()
        +extractLocations()
        +identifyPatterns()
    }
    
    class AIClient {
        +model
        +sendRequest()
    }
    
    class Database {
        +saveProfile()
        +saveCase()
        +fetchData()
    }
    
    App --> UserProfiling
    App --> CommunityAnalysis
    App --> Monitoring
    
    UserProfiling --> UserProfile
    UserProfiling --> SentimentItem
    UserProfiling --> RedditScraper
    UserProfiling --> ContentAnalyzer
    
    UserProfile --> Post
    UserProfile --> Comment
    
    ContentAnalyzer --> AIClient
    
    Monitoring --> RedditScraper
    Monitoring --> ContentAnalyzer
    
    CommunityAnalysis --> RedditScraper
    
    RedditScraper --> Database
    ContentAnalyzer --> Database
```

## Component Descriptions

### Frontend Components
- **App**: Main application component with routing
- **Dashboard**: Overview of cases and statistics
- **UserProfiling**: Analyzes Reddit user behavior with sentiment analysis
- **CommunityAnalysis**: Analyzes subreddit communities
- **LinkAnalysis**: Tracks and analyzes link relationships
- **Monitoring**: Real-time content monitoring with alerts
- **NewCase**: Creates new investigation cases
- **Report**: Generates and displays reports

### Data Models
- **UserProfile**: Reddit user data with posts and comments
- **SentimentItem**: Individual sentiment analysis result with XAI explanation
- **Post/Comment**: Reddit content items
- **Case**: Investigation case data
- **MonitoringResult**: Real-time monitoring data
- **Alert**: System alerts for monitoring

### Backend Services
- **RedditScraperService**: Handles Reddit API interactions (OAuth2, data fetching)
- **AnalyzeContentService**: Manages AI content analysis
- **LovableAIClient**: Interface to Lovable AI (Gemini 2.5 Flash)
- **DatabaseService**: Handles database operations
- **AuthService**: Manages user authentication

### UI Components
- **AnalyticsChart**: Recharts-based visualization
- **NetworkVisualization**: Force-directed graph visualization
- **WordCloud**: Word frequency visualization
