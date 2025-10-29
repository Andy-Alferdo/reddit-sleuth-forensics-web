# Use Case Diagram - Reddit Sleuth

This diagram shows the main actors and their interactions with the Reddit Sleuth system.

```mermaid
flowchart TB
    Admin([Admin User])
    Analyst([Analyst User])
    
    subgraph System["Reddit Sleuth System"]
        Login[Login/Authentication]
        Profile[User Profiling]
        Community[Community Analysis]
        Links[Link Analysis]
        Monitor[Content Monitoring]
        Reports[View Reports]
        Cases[Manage Cases]
    end
    
    subgraph External["External Services"]
        Reddit[Reddit API]
        AI[AI Service - Gemini]
    end
    
    Admin --> Login
    Admin --> Cases
    Admin --> Monitor
    
    Analyst --> Login
    Analyst --> Profile
    Analyst --> Community
    Analyst --> Links
    Analyst --> Monitor
    Analyst --> Reports
    
    Profile -.-> Reddit
    Profile -.-> AI
    Community -.-> Reddit
    Community -.-> AI
    Links -.-> Reddit
    Monitor -.-> Reddit
    Monitor -.-> AI
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
