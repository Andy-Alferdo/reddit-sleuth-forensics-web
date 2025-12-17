# Activity Diagram - Reddit Sleuth

```mermaid
stateDiagram-v2
    [*] --> Login
    Login --> Dashboard
    
    Dashboard --> UserProfiling
    Dashboard --> CommunityAnalysis
    Dashboard --> LinkAnalysis
    Dashboard --> Monitoring
    Dashboard --> CaseManagement
    
    UserProfiling --> Dashboard
    CommunityAnalysis --> Dashboard
    LinkAnalysis --> Dashboard
    Monitoring --> Dashboard
    CaseManagement --> Dashboard
    
    Dashboard --> [*]
```
