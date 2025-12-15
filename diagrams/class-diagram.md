# Class Diagram - Reddit Sleuth

This diagram shows the main classes and their relationships.

```mermaid
classDiagram
    direction TB
    
    class App {
        +routes
        +render()
    }
    
    class UserProfiling {
        +username
        +handleScrape()
    }
    
    class CommunityAnalysis {
        +subreddit
        +handleScrape()
    }
    
    class Monitoring {
        +keywords[]
        +startMonitoring()
    }
    
    class UserProfile {
        +username
        +karma
    }
    
    class SentimentItem {
        +text
        +sentiment
    }
    
    class Post {
        +id
        +title
    }
    
    class Comment {
        +id
        +body
    }
    
    class RedditScraper {
        +fetchUserData()
    }
    
    class ContentAnalyzer {
        +analyzeSentiment()
    }
    
    class AIClient {
        +sendRequest()
    }
    
    class Database {
        +saveData()
    }

    App "1" --> "1" UserProfiling : routes
    App "1" --> "1" CommunityAnalysis : routes
    App "1" --> "1" Monitoring : routes
    
    UserProfiling "1" --> "1" UserProfile : creates
    UserProfiling "1" --> "*" SentimentItem : generates
    
    UserProfile "1" --> "*" Post : contains
    UserProfile "1" --> "*" Comment : contains
    
    UserProfiling "1" ..> "1" RedditScraper : uses
    CommunityAnalysis "1" ..> "1" RedditScraper : uses
    Monitoring "1" ..> "1" RedditScraper : uses
    
    UserProfiling "1" ..> "1" ContentAnalyzer : uses
    Monitoring "1" ..> "1" ContentAnalyzer : uses
    
    ContentAnalyzer "1" --> "1" AIClient : calls
    
    RedditScraper "1" ..> "1" Database : stores
    ContentAnalyzer "1" ..> "1" Database : stores
```

## Legend

| Arrow Type | Meaning |
|------------|---------|
| `-->` | Association |
| `..>` | Dependency (uses) |

## Multiplicity

| Symbol | Meaning |
|--------|---------|
| `1` | Exactly one |
| `*` | Zero or more |

## Components

### Frontend Pages
- **App**: Main router
- **UserProfiling**: Reddit user analysis
- **CommunityAnalysis**: Subreddit analysis
- **Monitoring**: Real-time alerts

### Data Models
- **UserProfile**: User data
- **Post/Comment**: Reddit content
- **SentimentItem**: AI analysis result

### Services
- **RedditScraper**: Reddit API
- **ContentAnalyzer**: AI processing
- **AIClient**: Lovable AI
- **Database**: Data storage
