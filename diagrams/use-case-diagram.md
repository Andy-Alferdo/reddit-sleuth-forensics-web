# Use Case Diagram - Reddit Sleuth

This diagram shows the main actors and their interactions with the Reddit Sleuth system.

```mermaid
graph TB
    Admin([Admin])
    User([Analyst/User])
    
    subgraph "Reddit Sleuth System"
        UC1[Login/Authentication]
        UC2[User Profiling]
        UC3[Community Analysis]
        UC4[Link Analysis]
        UC5[Content Monitoring]
        UC6[Sentiment Analysis]
        UC7[View Reports]
        UC8[Manage Cases]
        UC9[Export Data]
        UC10[Configure Alerts]
    end
    
    subgraph "External Systems"
        Reddit[Reddit API]
        AI[AI Analysis Service]
    end
    
    Admin --> UC1
    Admin --> UC8
    Admin --> UC10
    
    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC9
    
    UC2 --> Reddit
    UC3 --> Reddit
    UC4 --> Reddit
    UC5 --> Reddit
    
    UC2 --> AI
    UC3 --> AI
    UC5 --> AI
    UC6 --> AI
```

## Actors

- **Admin**: System administrator with full access to configure monitoring and manage cases
- **Analyst/User**: Regular user who performs investigations and analysis

## Use Cases

1. **Login/Authentication**: User logs into the system
2. **User Profiling**: Analyze Reddit user behavior and patterns
3. **Community Analysis**: Analyze subreddit communities
4. **Link Analysis**: Track and analyze link relationships
5. **Content Monitoring**: Monitor keywords and posts in real-time
6. **Sentiment Analysis**: Analyze sentiment of posts and comments
7. **View Reports**: Generate and view analysis reports
8. **Manage Cases**: Create and manage investigation cases
9. **Export Data**: Export analysis results
10. **Configure Alerts**: Set up monitoring alerts
