Collaborative Canvas 
A real-time collaborative drawing application where multiple users can draw together on the same canvas simultaneously.

#Setup Instructions
Live Demo
collaborative-canvas-production-92c4.up.railway.app

Prerequisites
Node.js (version 14 or higher)

npm or yarn
Installation & Setup
1.Clone the repository
git clone https://github.com/DasariManasa11/collaborative-canvas.git
cd collaborative-canvas

2.Install dependencies
npm install

3.Start the application
npm start
The app will run on http://localhost:3000

4.Open in browser
Navigate to http://localhost:3000
Now You wil see the drawing canvas immediately
So you can Start drawing 

#How to test with multiple users
1.Multiple Browser Tabs (Quickest)
Open http://localhost:3000 in Chrome
Open the same URL in Firefox (or another Chrome tab in incognito mode)
Draw in one browser - watch it appear in the other instantly!
Test these features:
Draw with different colors in each window
Use the eraser tool
Change brush sizes
See live cursor movements
undo-redo functions

2.Method 2: Different Devices on Same WiFi
Find your computer's IP address:
Windows: Open Command Prompt → type ipconfig → look for "IPv4 Address"
Mac: Open Terminal → type ifconfig → look for "inet"
On other devices (phone, laptop, tablet):
Open browser and go to: http://YOUR_IP_ADDRESS:3000

3. Deploy Online (For Remote Friends)
Deploy to Railway (see Deployment section)
Share the public URL with friends
They can join from anywhere in the world

#Known limitations/bugs
1.No User Accounts
Anyone with the link can draw

2.Temporary Storage
Drawings disappear when server restarts
No save/load functionality
No drawing history

3.Technical Limits
Works best with under 20 simultaneous users

#Bugs
1.Visual Glitches
Sometimes lines appear choppy on slow connections

2.Connection Issues
If internet drops, you need to refresh the page
Very slow networks can cause sync issues
Sometimes reconnecting takes a few seconds

#Total Development Time: 3 - 4 Days
Day 1: Core Setup & Basic Drawing (8 hours)
Built the Node.js server and client structure
Implemented HTML5 canvas drawing functionality
Set up WebSocket connections for real-time communication
Created the basic drawing tools (brush, colors)

Day 2:Real-time Collaboration (9 hours)
Made drawings sync across multiple users instantly
Added live cursor tracking so users can see each other
Implemented eraser tool and brush size controls
Tested with multiple users and browsers

Day 3: Polish & Deployment (7 hours)
Added Undo/Redo functionality
Made it work on mobile devices
Fixed bugs and improved performance
Deployed to live server and wrote documentation

Day 4: Finally completed (4 hours)
Code cleanup and performance optimization
Enhanced error handling for better user experience
Additional testing with more simultaneous users
