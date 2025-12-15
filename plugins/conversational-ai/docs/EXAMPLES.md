# Conversational AI - Usage Examples

**Version:** 2.0.0

Real-world examples of using the Conversational AI plugin.

## Basic Chat

### Simple Conversation
```
User: /chat message:Hello! How are you today?
Bot: Hello, Master! I'm doing wonderfully, thank you for asking! 
     How may I assist you today? 🌸
```

### Follow-up Questions
```
User: /chat message:What's the capital of France?
Bot: The capital of France is Paris! It's known as the "City of Light" 
     and is famous for the Eiffel Tower, the Louvre, and delicious cuisine.

User: /chat message:What about Germany?
Bot: The capital of Germany is Berlin! It's a vibrant city with rich 
     history, known for the Brandenburg Gate and its thriving arts scene.
     (The bot remembers you were asking about capitals!)
```

## Memory Management

### Viewing Memory
```
User: /memory view

Bot: 🧠 Short-Term Memory
     
     👤 User (10:30 AM)
     What's the capital of France?
     
     🤖 Bot (10:30 AM)
     The capital of France is Paris!...
     
     Messages: 4 | Tokens: 256 | Channel: #general
```

### Clearing Memory
```
User: /memory clear

Bot: 🧹 Memory Cleared
     Cleared 4 messages from short-term memory.
```

### Memory Statistics
```
User: /memory stats

Bot: 📊 Memory Statistics
     
     📝 Short-Term Memory
     ━━━━━━━━━━━━━━━
     Active Channels: 3
     Total Messages: 47
     Total Tokens: 2,891
     
     🧠 Semantic Memory
     ━━━━━━━━━━━━━━━
     Status: ✅ Enabled
     Stored Memories: 12
```

## AI Settings

### Viewing Settings
```
User: /ai settings

Bot: ⚙️ AI Settings
     
     📝 Memory Settings
     ━━━━━━━━━━━━━━━
     Max Tokens: 4000
     Max Messages: 50
     Semantic Memory: ✅ Enabled
     
     🎯 Interaction Settings
     ━━━━━━━━━━━━━━━
     Prefix Commands: ✅ Enabled
     Passive Triggers: ✅ Enabled
     Mention Required: ❌ No
```

### Viewing Context
```
User: /ai context

Bot: 🧠 Current AI Context
     
     Short-Term Memory: 4 messages (256 tokens)
     👤 What's the capital of France?
     🤖 The capital of France is Paris!...
     👤 What about Germany?
     
     Personality: 🌸 Maid
     Semantic Memory: 12 stored memories
     
     Channel: #general | User: @YourName
```

### Changing Personality
```
User: /ai personality style:pirate

Bot: ✨ Personality Changed
     Your AI personality is now **🏴‍☠️ Pirate**
     
     Description: Arr matey! Speaks like a sea-faring buccaneer

User: /chat message:Hello!
Bot: Ahoy there, landlubber! What brings ye to these waters? 
     Ready to set sail on an adventure? ⚓
```

## Prefix Commands

### Help Command
```
User: !help

Bot: 📚 Available Commands
     
     ! Commands (Actions)
     • !help - Show this help
     • !status - Bot status
     
     ? Queries (Questions)
     • ?weather - Weather info
     • ?devices - Network devices
     
     . Quick Actions
     • .ping - Quick ping
     • .scan - Network scan
```

### Query Example
```
User: ?status

Bot: 📊 System Status
     Bot: Online ✅
     Uptime: 2d 5h 30m
     Memory: 128MB
     Plugins: 16 loaded
```

## Mention Interaction

### Direct Question
```
User: @Bot what time is it in Tokyo?

Bot: 🕐 It's currently 3:45 PM in Tokyo, Japan (JST, UTC+9).
     That's 9 hours ahead of UTC!
```

### Empty Mention (Help)
```
User: @Bot

Bot: 👋 Hello!
     You mentioned me! How can I help you?
     
     Commands:
     • /chat <message> - Chat with me
     • /memory view - View conversation memory
     • /ai settings - View AI settings
     
     Prefix Commands:
     • !help - Get help
     • ?status - Check status
     • .ping - Quick ping
```

## Reply Context

### Following Up on Game Results
```
User A: /game play trivia

Bot: 🧠 Trivia Time!
     Question: What year did the first iPhone release?
     A) 2005  B) 2007  C) 2009  D) 2011
     
     [Game plays out...]
     
     Results: User A scored 3/5!

User B: [Replies to bot's message]
        What was the answer to the iPhone question?

Bot: The answer was B) 2007! The first iPhone was announced by 
     Steve Jobs on January 9, 2007, and released on June 29, 2007.
     It revolutionized the smartphone industry! 📱
```

### Following Up on Research
```
User A: /research query:quantum computing basics

Bot: 🔬 Research Results
     [Detailed research about quantum computing...]

User B: [Replies to bot's message]
        Can you explain qubits in simpler terms?

Bot: Of course! Based on the research I just shared:
     
     A qubit is like a coin that can be heads, tails, or BOTH 
     at the same time (until you look at it). This "both at once" 
     state is called superposition, and it's what makes quantum 
     computers so powerful! 🪙
```

## Passive Triggers

### Code Block Detection
```
User: Here's my code that's not working:
      ```python
      def hello():
          print("Hello World"
      ```

Bot: 💡 I noticed something!
     
     I see you shared some Python code. Would you like me to:
     • Review it for errors
     • Explain what it does
     • Suggest improvements
     
     React with 👍 if you'd like help
```

### Error Detection
```
User: I'm getting this error:
      TypeError: Cannot read property 'map' of undefined

Bot: 💡 I noticed something!
     
     I see an error message! This typically means you're trying 
     to call .map() on a variable that is undefined.
     
     Common fixes:
     • Check if the variable is initialized
     • Add a null check: `array?.map()`
     • Verify your data is loading correctly
     
     React with 👍 if you'd like more help
```

## Advanced Usage

### Context-Aware Conversations
```
User: /chat message:I'm working on a Python project

Bot: That's great! Python is wonderful for many things. 
     What kind of project are you working on?

User: /chat message:It's a web scraper

Bot: Ah, a web scraper! For Python web scraping, I'd recommend:
     • BeautifulSoup for parsing HTML
     • Requests for fetching pages
     • Selenium if you need JavaScript rendering
     
     Would you like help with any specific part?

User: /chat message:How do I handle rate limiting?

Bot: Great question! For rate limiting in your web scraper:
     
     1. Add delays: `time.sleep(1)` between requests
     2. Use exponential backoff for retries
     3. Respect robots.txt
     4. Consider using a library like `ratelimit`
     
     (The bot remembers you're building a Python web scraper!)
```

---

## See Also

- [Plugin Overview](README.md)
- [Commands Reference](COMMANDS.md)
- [API Reference](API.md)
