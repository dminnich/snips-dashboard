# tech decisions
- Frontend: tailwind, react, html
- backend: firebase + websockets for real time refresh
- app features: password protected admin mode for adding/editing events, password protected display mode for viewing events, dark/light theme support
- hosting: netlify on an obscure URL
- layout must look great on 16:9 monitor

# calendar syncing
The apple calendar will be set to public. The app should pull it directly not via Zapier/Make.

When there is a conflict an "!" image should be shown inside the app.  Clicking it will let you see information about the event on the apple calendar.

When there isn't a conflict the apple calendar event should be shown inside of the app.  But prefix the event text with an apple emoji.



# event editor in the summer
clicking an empty spot in a week will allow you to create a new card.

card fields are: group name, headcount, housing assignment

and a status dropdown of the following:
 - mission = text is red
 - pending = text is orange
 - paid = text is green

clicking an existing card lets you edit it

# event editor in non-summer months
clicking on an empty month gives you a free form text editor with a simplistic WYSIWYG editor.  Allowing for bold/italic/underline, font size, and color options, etc.

clicking an existing spot in a summer month will pop open the editor and allow you to change it.

# special events and heading subtitle editor
clicking the month name or week name itself should pop up an editor with 2 options.

The first option will "subtitle". This is a simple text field. Anything that is typed here will be shown below the hardcoded month name or week numbers.  It is intended to store the date range of each summer week that will change each year.

The next section will be for special events.  This will be a freeform text editor with a simplistic WYSIWYG editor. What is saved here will be shown in a less prominent way (smaller text, defaults to more muted colors) at the bottom of the month or week chosen.  The intent is to list out things like birthdays or one-off things that may not be directly related to the mission event planning.


# UI notes
underneath the entire layout you create a legend.  here you will show squares of different colors and text describing what the colors mean.

month and week information should always centered horizontally and vertically and in all caps

The layout is 3 master columns.

The left and right columns are 20% of the total display size.  The middle column is the other 60%.

The left and right columns will have 5 equally sized rows for the non-summer months.   Left is Jan...May.  Right is August...Dec.

The middle column:
 - is split vertically 5 ways into main sections of equal size and horizontally 2 ways into main sections each being of equal size
 - Each horizontal main section is further divided into 4 subsections/rows
 - The top row of the top horizontal section will be for Week 1..5 and will display that text.  It will be 20% thinner than the other rows in that section.
 - Rows 2-4 inside of the top horizontal section will be of equal size and will be clickable to add events
 - The top row of the bottom horizontal section will be for Week 6..10 and will display that text.  It will be 20% thinner than the other rows in that section.
 - Rows 6-8 inside of the bottom horizontal section will be of equal size and will be clickable to add events


for the "special events and heading subtitle editor" features I mentioned before, you may need to add rows inside of things to accomplish this