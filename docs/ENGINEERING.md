# Engineering Notes & Best Practices

## Development Environment Setup

### **Prerequisites**
```bash
Node.js 18+ 
npm 8+
Git
```

### **Environment Variables**
```bash
# .env.local
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### **Installation & Setup**
```bash
# Clone and install
git clone https://github.com/k3nnethfrancis/gmail-agent.git
cd gmail-agent
npm install

# Setup environment
cp .env.example .env.local
# Add your API keys

# Start development
npm run dev

# Verify setup
curl http://localhost:3000/api/test/calendar
```

---

## Code Quality Standards

### **TypeScript Configuration**
- **Strict mode enabled**: All type errors must be resolved
- **No `any` types**: Use proper type definitions or `unknown` with narrowing
- **Interface definitions**: All major data structures must have interfaces

### **ESLint Rules**
```json
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    "prefer-const": "error",
    "no-var": "error", 
    "default-param-last": "error",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

### **Error Handling Patterns**
```typescript
// ✅ Correct error handling
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error('Operation failed:', error);
  return { success: false, error: errorMessage };
}

// ❌ Avoid this
catch (error: any) {
  console.log(error); // Use console.warn or console.error
}
```

---

## API Development Patterns

### **Route Structure**
```typescript
// Standard API route pattern
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check
    const tokens = await getTokensFromCookies();
    if (!tokens.accessToken) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    }

    // 2. Input validation
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // 3. Business logic
    const result = await businessLogicFunction(tokens, { limit });

    // 4. Response formatting
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    return handleAPIError(error);
  }
}
```

### **Database Service Patterns**
```typescript
// Service class pattern
export class EmailService {
  constructor(private db: Database) {}

  getEmails(options: EmailQueryOptions = {}): EmailRecord[] {
    const { limit = 50, offset = 0 } = options;
    // Use prepared statements for performance
    const stmt = this.db.prepare('SELECT * FROM emails ORDER BY received_at DESC LIMIT ? OFFSET ?');
    return stmt.all(limit, offset) as EmailRecord[];
  }

  // Always return consistent format
  createEmail(email: EmailInput): { success: boolean; email?: EmailRecord; error?: string } {
    try {
      const stmt = this.db.prepare('INSERT INTO emails (...) VALUES (...)');
      const result = stmt.run(...values);
      return { success: true, email: this.getEmailById(result.lastInsertRowid) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

---

## Component Development Guidelines

### **Component Structure**
```typescript
// Component template
interface ComponentProps {
  required: string;
  optional?: number;
  onAction: (data: ActionData) => void;
}

export default function Component({ required, optional = 0, onAction }: ComponentProps) {
  // 1. State declarations
  const [localState, setLocalState] = useState<StateType>(initialValue);
  
  // 2. Effects and data fetching
  useEffect(() => {
    fetchData();
  }, [dependency]);
  
  // 3. Event handlers
  const handleEvent = useCallback((event: EventType) => {
    // Handle event logic
    onAction(result);
  }, [dependency]);
  
  // 4. Helper functions
  const formatData = (data: RawData): FormattedData => {
    // Pure function for data transformation
  };
  
  // 5. Render logic
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div className="component-container">
      {/* Component JSX */}
    </div>
  );
}
```

### **State Management Principles**
- **Local state first**: Use useState for component-specific data
- **Lift state up**: Move shared state to parent components
- **Context sparingly**: Only for truly global state (auth, theme)
- **Avoid prop drilling**: Use context or component composition

---

## Database Best Practices

### **SQLite Optimization**
```sql
-- Always create indexes for frequently queried columns
CREATE INDEX idx_emails_received_at ON emails(received_at);
CREATE INDEX idx_emails_is_unread ON emails(is_unread);
CREATE INDEX idx_email_tags_email_id ON email_tags(email_id);

-- Use prepared statements for performance
const stmt = db.prepare('SELECT * FROM emails WHERE received_at > ?');
const recentEmails = stmt.all(dateThreshold);
```

### **Database Service Integration**
```typescript
// Initialize services as singletons
const db = new Database(DATABASE_PATH);
export const emailService = new EmailService(db);
export const tagService = new TagService(db);

// Use transactions for related operations
const transaction = db.transaction((emails, tags) => {
  for (const email of emails) {
    emailService.createEmail(email);
    for (const tag of tags) {
      tagService.assignTag(email.id, tag.id);
    }
  }
});
```

---

## Authentication & Security

### **OAuth Implementation**
```typescript
// Standard OAuth flow
export async function GET(request: NextRequest) {
  const code = searchParams.get('code');
  
  // Exchange code for tokens
  const tokenResponse = await oauth2Client.getToken(code);
  const { tokens } = tokenResponse;
  
  // Store in HTTP-only cookies
  const response = NextResponse.redirect('/');
  response.cookies.set('access_token', tokens.access_token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: tokens.expiry_date
  });
  
  return response;
}
```

### **Security Checklist**
- ✅ HTTP-only cookies for token storage
- ✅ Input validation on all API endpoints  
- ✅ No secrets in client-side code
- ✅ Proper CORS configuration
- ✅ Error message sanitization

---

## Testing Strategy

### **Unit Testing**
```typescript
// Jest test example
describe('EmailService', () => {
  let emailService: EmailService;
  let mockDB: Database;
  
  beforeEach(() => {
    mockDB = new Database(':memory:');
    initializeTestSchema(mockDB);
    emailService = new EmailService(mockDB);
  });
  
  test('should create email successfully', () => {
    const result = emailService.createEmail(mockEmailData);
    expect(result.success).toBe(true);
    expect(result.email).toBeDefined();
  });
});
```

### **API Testing**
```typescript
// API route testing
import { GET } from '@/app/api/emails/route';

test('/api/emails returns emails with auth', async () => {
  const request = new NextRequest('http://localhost:3000/api/emails');
  // Mock authentication
  jest.spyOn(authModule, 'getTokensFromCookies').mockResolvedValue(mockTokens);
  
  const response = await GET(request);
  const data = await response.json();
  
  expect(response.status).toBe(200);
  expect(data.success).toBe(true);
  expect(Array.isArray(data.emails)).toBe(true);
});
```

---

## Performance Optimization

### **Database Queries**
- Use prepared statements for repeated queries
- Implement proper indexing strategy
- Batch operations where possible
- Pagination for large datasets

### **API Response Optimization**
- Return only necessary fields
- Implement response caching where appropriate
- Use streaming for large datasets
- Compress responses in production

### **Frontend Performance**
- Lazy load components not immediately visible
- Optimize re-renders with React.memo and useCallback
- Implement virtual scrolling for large lists
- Cache API responses with SWR or React Query

---

## Debugging & Logging

### **Structured Logging**
```typescript
// Use consistent logging format
console.warn('📧 Email operation started', {
  operation: 'classification',
  emailCount: emails.length,
  timestamp: new Date().toISOString()
});

// Error logging with context
console.error('❌ Classification failed', {
  error: error.message,
  emailId: email.id,
  retryCount: attempt
});
```

### **Development Tools**
- **React DevTools**: Component inspection
- **Network tab**: API call analysis  
- **Application tab**: Cookie and storage inspection
- **Console**: Structured logging output

### **Production Monitoring**
- Error tracking (Sentry, LogRocket)
- Performance monitoring (Vercel Analytics)
- Uptime monitoring (Pingdom, UptimeRobot)
- Database monitoring (query performance, storage usage)

---

## Deployment Guidelines

### **Environment Configuration**
```bash
# Production environment variables
NODE_ENV=production
GOOGLE_CLIENT_ID=[production_client_id]
GOOGLE_CLIENT_SECRET=[production_secret]  
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
ANTHROPIC_API_KEY=[production_key]
```

### **Build Process**
```bash
# Production build
npm run build
npm run start

# Docker deployment (optional)
docker build -t calendar-assistant .
docker run -p 3000:3000 calendar-assistant
```

### **Health Checks**
- Database connectivity: `/api/health/db`
- External API status: `/api/health/apis`
- Authentication flow: `/api/health/auth`

This engineering documentation provides the foundation for maintaining high code quality and consistent development practices.