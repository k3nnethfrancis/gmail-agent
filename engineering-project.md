## Overview

### **Calendar Assistant**

You can build a web or mobile interface for this project. If you decide to build a web interface, use React. If you decide to build a mobile interface, use Expo. Through this interface, a user should be able to authenticate a gsuite account, which should be used to pull calendar information. Display this calendar information in a way that makes sense.

Then, there should be a simple chat interface that allows the user to chat with their calendar agent. The user should be able to say things like “I have three meetings I need to schedule with Joe, Dan, and Sally. I really want to block my mornings off to work out, so can you write me an email draft I can share with each of them?” and “How much of my time am I spending in meetings? How would you recommend I decrease that?”


### **Inbox Concierge**

You can build a web or mobile interface for this project. If you decide to build a web interface, use React. If you decide to build a mobile interface, use Expo. Through this interface, a user should be able to authenticate a GSuite account, which should be used to give gmail access.

On load, group the user’s last 200 threads into buckets (Important, Can wait, Auto-archive, Newsletter, etc.) using an LLM-powered classification pipeline you design. You only need to show the emails with their subject lines and a preview, like the homepage of any email application. Users do not have to be able to click into the emails.

Then, allow the users to create their own buckets, outside of the default options you choose, which should then recategorize all of the emails based on the new buckets.


## Objective

Lets combine these two projects. We will use the claude code sdk coupled with MCPs that enable both of these features.