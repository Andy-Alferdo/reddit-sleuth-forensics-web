# Use Case Diagram - Reddit Sleuth

```mermaid
flowchart TB
    User([User])
    Admin([Admin])
    
    subgraph System["Reddit Sleuth"]
        Login[Login]
        Dashboard[Dashboard]
        UserProfile[User Profiling]
        Community[Community Analysis]
        Links[Link Analysis]
        Monitor[Monitoring]
        Reports[Reports]
        NewCase[New Case]
        AdminPanel[Admin Dashboard]
    end
    
    User --> Login
    User --> Dashboard
    User --> UserProfile
    User --> Community
    User --> Links
    User --> Monitor
    User --> Reports
    User --> NewCase
    
    Admin --> Login
    Admin --> AdminPanel
```

## Actors
- **User**: Performs investigations and analysis
- **Admin**: Manages system and users

## Use Cases
1. **Login**: User authentication
2. **Dashboard**: View case overview and stats
3. **User Profiling**: Analyze Reddit user behavior
4. **Community Analysis**: Analyze subreddits
5. **Link Analysis**: Track link relationships
6. **Monitoring**: Real-time content monitoring
7. **Reports**: Generate analysis reports
8. **New Case**: Create investigation cases
9. **Admin Dashboard**: User management (admin only)
