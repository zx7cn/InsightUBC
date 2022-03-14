Please edit this template and commit to the master branch for your user stories submission.   
Make sure to follow the *Role, Goal, Benefit* framework for the user stories and the *Given/When/Then* framework for the Definitions of Done! You can also refer to the examples DoDs in [C3 spec](https://sites.google.com/view/ubc-cpsc310-21w2-intro-to-se/project/checkpoint-3).

## User Story 1
As a student, I want to be able to find which instructor of a course has the highest average, so that I can pick the best instructor.


#### Definitions of Done(s)
Scenario 1: valid course is specified  
Given: a valid course dataset containing the specified course has been added to the server and user is on the client web page    
When: the user specifies a course and selects ‘instructor’ and sorts by ‘overall average’ and clicks search    
Then: the webpage refreshes and presents the user with a table of instructors and overall averages sorted by overall average.  

Scenario 2: invalid course is specified  
Given: a valid course dataset not containing the specified course has been added to the server and user is on the client web page    
When: the user specifies a course and selects ‘instructor’ and sorts by ‘overall average’ and clicks search    
Then: the webpage refreshes and reports that no courses found matching the specified course.

## User Story 2
As a UBC student club administrator planning an event, I want to be able to identify all rooms at UBC with a minimum capacity and with required furniture.


#### Definitions of Done(s)
Scenario 1: Matching Rooms Found  
Given: a valid room dataset has been added to the server and user is on the client web page  
When: the user specifies the minimum capacity and the user selects preferred furniture type and then clicks search and a satisfying room exists in the available dataset  
Then: the webpage refreshes and presents the user with a table of rooms satisfying the search requirements.

Scenario 2: No Matching Room Found  
Given: a valid room dataset has been added to the server and user is on the client web page  
When: the user specifies the minimum capacity and the user selects preferred furniture type and then clicks search and no satisfying room exists in the available dataset  
Then: the webpage refreshes and reports that no rooms have been found matching the search requirements.

## Others
You may provide any additional user stories + DoDs in this section for general TA feedback.  
Note: These will not be graded.
