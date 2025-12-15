# Class Diagram - Reddit Sleuth

This diagram shows all classes and their relationships.

```mermaid
classDiagram
    direction TB
    
    %% Frontend Pages
    class App {
        +routes
        +render()
    }
    
    class Dashboard {
        +cases[]
        +stats
        +displayOverview()
    }
    
    class UserProfiling {
        +username
        +profileData
        +posts[]
        +comments[]
        +sentiments[]
        +handleScrape()
        +generateWordCloud()
    }
    
    class CommunityAnalysis {
        +subreddit
        +communityData
        +members
        +handleScrape()
        +analyzeTrends()
    }
    
    class LinkAnalysis {
        +subreddits[]
        +connections[]
        +analyzeCrossLinks()
        +findSharedUsers()
    }
    
    class Monitoring {
        +keywords[]
        +interval
        +results[]
        +startMonitoring()
        +stopMonitoring()
    }
    
    class Report {
        +caseId
        +reportType
        +exportFormat
        +generateReport()
        +saveDraft()
    }
    
    class NewCase {
        +title
        +description
        +createCase()
    }
    
    %% Data Models
    class UserProfile {
        +username
        +karma
        +accountAge
        +timezone
    }
    
    class Post {
        +id
        +title
        +content
        +score
        +subreddit
    }
    
    class Comment {
        +id
        +body
        +score
        +subreddit
    }
    
    class SentimentItem {
        +text
        +sentiment
        +confidence
        +explanation
    }
    
    class NetworkNode {
        +id
        +name
        +connections
    }
    
    class Case {
        +id
        +title
        +status
        +createdAt
    }
    
    %% Services
    class RedditScraper {
        +authenticate()
        +fetchUserData()
        +fetchSubreddit()
        +searchContent()
    }
    
    class ContentAnalyzer {
        +analyzeSentiment()
        +extractLocations()
        +generateXAI()
    }
    
    class AIClient {
        +model
        +sendRequest()
        +parseResponse()
    }
    
    class Database {
        +saveProfile()
        +saveCase()
        +fetchData()
    }
    
    class AuthService {
        +login()
        +logout()
        +checkRole()
    }

    %% App Routes
    App "1" --> "1" Dashboard : routes
    App "1" --> "1" UserProfiling : routes
    App "1" --> "1" CommunityAnalysis : routes
    App "1" --> "1" LinkAnalysis : routes
    App "1" --> "1" Monitoring : routes
    App "1" --> "1" Report : routes
    App "1" --> "1" NewCase : routes
    
    %% UserProfiling Relationships
    UserProfiling "1" --> "1" UserProfile : creates
    UserProfiling "1" --> "*" SentimentItem : generates
    UserProfile "1" --> "*" Post : contains
    UserProfile "1" --> "*" Comment : contains
    
    %% LinkAnalysis Relationships
    LinkAnalysis "1" --> "*" NetworkNode : creates
    
    %% Report Relationships
    Report "1" --> "1" Case : uses
    
    %% NewCase Relationships
    NewCase "1" --> "1" Case : creates
    
    %% Service Dependencies
    UserProfiling "1" ..> "1" RedditScraper : uses
    CommunityAnalysis "1" ..> "1" RedditScraper : uses
    LinkAnalysis "1" ..> "1" RedditScraper : uses
    Monitoring "1" ..> "1" RedditScraper : uses
    
    UserProfiling "1" ..> "1" ContentAnalyzer : uses
    Monitoring "1" ..> "1" ContentAnalyzer : uses
    
    ContentAnalyzer "1" --> "1" AIClient : calls
    
    %% Database Dependencies
    RedditScraper "1" ..> "1" Database : stores
    ContentAnalyzer "1" ..> "1" Database : stores
    Report "1" ..> "1" Database : reads
    NewCase "1" ..> "1" Database : stores
    
    %% Auth Dependencies
    App "1" ..> "1" AuthService : uses
```

## Legend

| Arrow | Meaning |
|-------|---------|
| `-->` | Association (owns/creates) |
| `..>` | Dependency (uses) |

## Multiplicity

| Symbol | Meaning |
|--------|---------|
| `1` | Exactly one |
| `*` | Zero or more |

## Components

### Frontend Pages
| Component | Description |
|-----------|-------------|
| **App** | Main router with authentication |
| **Dashboard** | Case overview and statistics |
| **UserProfiling** | Reddit user analysis with sentiment |
| **CommunityAnalysis** | Subreddit statistics and trends |
| **LinkAnalysis** | Cross-community connections |
| **Monitoring** | Real-time keyword tracking |
| **Report** | Generate PDF/HTML reports |
| **NewCase** | Create investigation cases |

### Data Models
| Model | Description |
|-------|-------------|
| **UserProfile** | Reddit user data |
| **Post/Comment** | Reddit content |
| **SentimentItem** | AI sentiment result with XAI |
| **NetworkNode** | Graph visualization node |
| **Case** | Investigation case data |

### Services
| Service | Description |
|---------|-------------|
| **RedditScraper** | Reddit API integration |
| **ContentAnalyzer** | AI sentiment analysis |
| **AIClient** | Lovable AI (Gemini 2.5 Flash) |
| **Database** | Data persistence |
| **AuthService** | User authentication |
