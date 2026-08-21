// frontend/src/app/how-it-works/page.tsx
import React from 'react';

export const metadata = {
    title: 'How It Works - Demo Project',
    description: 'A detailed explanation of the project architecture and functionality.',
};

export default function HowItWorks() {
    // Store the exact transaction layout in a clean template literal string
    const architectureDiagram = `
[Frontend Browser] 
    │
    ├── 1. POST /api/submitDues (NextJS Proxy) ──> [Main Backend (5000)]
    │                                                    │ (Saves pending record)
    │                                                    ▼
    │   <─── Returns generated track token ──────────────┘
    │
    ├── 2. POST /api/orders ─────────────────────> [PayPal Backend (5556)]
    │                                                    │ (Calls PayPal API)
    │                                                    ▼
    │   <─── Returns secure PayPal Order ID ─────────────┘
    │
    ├── 3. Pop-up opens, user clicks pay.
    │
    └── 4. POST /api/orders/:id/capture ─────────> [PayPal Backend (5556)]
                                                         │ (Finalizes payment)
                                                         ▼
                                                    [Main Backend (5000)]
                                                         │ (Updates SQLite status)
                                                         ▼
                                                    [Database Updated]
  `;

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-slate-900">How This Website Functions</h2>

            <section className="mb-6">
                <h3 className="text-xl font-semibold mb-4 text-slate-900 border-b border-slate-200 pb-1">
                    System Infrastructure Workflow
                </h3>
                {/* Render inside a <pre> tag using monospace font values to retain shapes */}
                <div className="bg-slate-900 text-emerald-400 p-4 rounded-lg overflow-x-auto shadow-inner border border-slate-800">
                    <pre className="font-mono text-xs sm:text-sm leading-relaxed whitespace-pre">
                        {architectureDiagram}
                    </pre>
                </div>
            </section>

            <section className="mb-6">
                <h3 className="text-xl font-semibold mb-2">1. Overall Architecture: Monolithic vs. Distributed</h3>
                <p className="text-gray-700 mb-2">
                    This demonstration project utilizes a <strong>distributed architecture</strong>, separating the frontend and backend into distinct applications. This approach offers several advantages:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700">
                    <li><strong>Scalability:</strong> Frontend and backend can be scaled independently.</li>
                    <li><strong>Maintainability:</strong> Clear separation of concerns makes development and debugging easier.</li>
                    <li><strong>Technology Flexibility:</strong> Different technologies can be used for each part (e.g., Python for backend, JavaScript for frontend).</li>
                    <li><strong>Team Collaboration:</strong> Separate teams can work on frontend and backend simultaneously with minimal conflicts.</li>
                </ul>
            </section>

            <section className="mb-6">
                <h3 className="text-xl font-semibold mb-2">2. Frontend: Next.js and React</h3>
                <p className="text-gray-700 mb-2">
                    The user interface (UI) of this website is built using <strong>Next.js</strong> and <strong>React</strong>.
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2 text-gray-700">
                    <li>
                        <strong>React:</strong> A JavaScript library for building user interfaces. It allows for creating reusable UI components and efficiently updates and renders components when data changes.
                    </li>
                    <li>
                        <strong>Next.js:</strong> A React framework that enables powerful features like:
                        <ul className="list-circle list-inside ml-8 mt-1 space-y-1">
                            <li><strong>Server-Side Rendering (SSR):</strong> Pages are rendered on the server before being sent to the client, improving initial load performance and SEO.</li>
                            <li><strong>Static Site Generation (SSG):</strong> Pages can be pre-rendered at build time, leading to extremely fast page loads for static content.</li>
                            <li><strong>File-system based Routing:</strong> Pages are automatically routed based on their file names in the <code>src/app</code> directory (App Router).</li>
                            <li><strong>API Routes:</strong> Next.js allows you to create API endpoints directly within your Next.js project. For this demo, we use a separate Express backend for clarity.</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Components:</strong> The frontend is composed of various React components (e.g., Header, Footer, SideMenu, and individual page components) that encapsulate UI logic and render specific parts of the page.
                    </li>
                    <li>
                        <strong>Navigation:</strong> The left-side menu uses Next.js&apos;s <code>Link</code> component for client-side navigation, which preloads pages for a smooth user experience without full page reloads.
                    </li>
                </ul>
            </section>

            <section className="mb-6">
                <h3 className="text-xl font-semibold mb-2">3. Backend: Node.js and Express.js</h3>
                <p className="text-gray-700 mb-2">
                    The server-side logic and API for this website are handled by <strong>Node.js</strong> and <strong>Express.js</strong>.
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2 text-gray-700">
                    <li>
                        <strong>Node.js:</strong> A JavaScript runtime environment that allows you to run JavaScript code outside of a web browser. It&apos;s ideal for building fast and scalable network applications.
                    </li>
                    <li>
                        <strong>Express.js:</strong> A fast, unopinionated, minimalist web framework for Node.js. It simplifies the process of building robust APIs and web applications by providing:
                        <ul className="list-circle list-inside ml-8 mt-1 space-y-1">
                            <li><strong>Routing:</strong> Handles different HTTP requests (GET, POST, etc.) to specific URL paths.</li>
                            <li><strong>Middleware:</strong> Functions that have access to the request and response objects, and the next middleware function in the application&apos;s request-response cycle.</li>
                            <li><strong>API Endpoints:</strong> Exposes data or functionality to the frontend through RESTful APIs (e.g., <code>/api/hello</code>, <code>/api/data</code>).</li>
                        </ul>
                    </li>
                    <li>
                        <strong>CORS (Cross-Origin Resource Sharing):</strong> Configured in the Express backend to allow the Next.js frontend (running on a different port) to make requests to the backend API securely.
                    </li>
                </ul>
            </section>

            <section className="mb-8">
                <h3 className="text-xl font-semibold mb-3 text-slate-900 border-b border-slate-200 pb-1">
                    4. Data Flow (Frontend-Backend Interaction)
                </h3>
                <p className="text-slate-700 mb-4 leading-relaxed">
                    When the frontend needs data (e.g., a list of items), it makes an HTTP request (using &lsquo;fetch&rsquo; or a library like Axios) to a specific API endpoint exposed by the Express.js backend.
                </p>
                <ol className="list-decimal list-inside ml-4 space-y-2 text-slate-700 leading-relaxed">
                    <li>The user interacts with the Next.js frontend.</li>
                    <li>
                        The frontend (a React component) initiates a &lsquo;fetch&rsquo; request to an Express.js API endpoint (e.g., <code>http://localhost:5000/api/data</code>).
                    </li>
                    <li>
                        The Express.js backend receives the request, processes it (e.g., retrieves data from a database), and sends a JSON response back to the frontend.
                    </li>
                    <li>
                        The Next.js frontend receives the JSON data and updates its React components to display the information to the user.
                    </li>
                </ol>
                <p className="text-blue-800 mt-4 leading-relaxed font-medium italic bg-blue-50/50 p-3 rounded border-l-4 border-blue-600">
                    This clear separation allows for independent development and deployment of both parts of the application.
                </p>
            </section>

            <section className="mb-8">
                <h3 className="text-xl font-semibold mb-3 text-slate-900 border-b border-slate-200 pb-1">
                    5. PayPal Specific Details
                </h3>
                <p className="text-slate-700 mb-3 leading-relaxed">
                    A standard PayPal interface works via the PayPal JavaScript SDK, which splits processing into two main stages: <span className="text-blue-900 font-semibold">Creating the Order</span> and <span className="text-blue-900 font-semibold">Capturing the Payment</span>.
                </p>
                <p className="text-slate-700 mb-4 leading-relaxed">
                    This architecture protects data by letting PayPal securely handle sensitive money transfers. Here is the step-by-step breakdown of how the frontend and backend communicate:
                </p>
                <div className="space-y-6 ml-4">
                    <div>
                        <h4 className="font-semibold text-blue-900 mb-2 underline decoration-blue-600 decoration-2 underline-offset-4 tracking-wide uppercase text-sm">
                            Stage 1: Creating the Order
                        </h4>
                        <ol className="list-decimal list-inside space-y-2 text-slate-700 leading-relaxed">
                            <li>
                                <strong className="text-slate-900">Frontend:</strong> The user goes to the checkout page. The frontend loads the PayPal button via the JS SDK using your merchant client-id.
                            </li>

                            <li>
                                <strong className="text-slate-900">Frontend:</strong> The user goes to the checkout page. The frontend
                                loads the PayPal button via the JS SDK using your merchant client-id.
                            </li>
                            <li>
                                <strong className="text-slate-900">Frontend:</strong> The user clicks &quot;PayPal.&quot; The frontend
                                triggers a request to your server to start the order.
                            </li>
                            <li>
                                <strong className="text-slate-900">Backend:</strong> Your server securely calls PayPal's Create Order API.
                                It calculates the final total (preventing frontend tampering) and requests an orderID.
                            </li>
                            <li>
                                <strong className="text-slate-900">Backend/Frontend:</strong> The backend sends the unique orderID back to the frontend.
                            </li>
                            <li>
                                <strong className="text-slate-900">Frontend:</strong> The PayPal SDK uses this orderID to open the secure PayPal
                                payment pop-up window so the buyer can log in and approve the funds.
                            </li>
                        </ol>
                    </div>

                    <div>
                        <h4 className="font-semibold text-blue-900 mb-2 underline decoration-blue-600 decoration-2 underline-offset-4 tracking-wide uppercase text-sm">
                            Stage 2: Capturing the Payment
                        </h4>
                        <ol className="list-decimal list-inside space-y-2 text-slate-700 leading-relaxed" start={1}>
                            <li>
                                <strong className="text-slate-900">Frontend:</strong> The user confirms the payment inside the PayPal window.
                                PayPal closes the pop-up and the SDK notifies your frontend of a successful approval.
                            </li>
                            <li>
                                <strong className="text-slate-900">Frontend:</strong> The frontend makes a final call to your server
                                (e.g., <code>POST /api/capture</code>) requesting the payment to be finalized.
                            </li>
                            <li>
                                <strong className="text-slate-900">Backend:</strong> Your server uses the Capture Payment API to actually pull
                                the money from the user’s account into your merchant account.
                            </li>
                            <li>
                                <strong className="text-slate-900">Backend:</strong> Once successful, your server saves the transaction details
                                (transaction ID, status, user details) to your database.
                            </li>
                            <li>
                                <strong className="text-slate-900">Backend/Frontend:</strong> Your backend sends a success response to the frontend,
                                allowing the frontend to redirect the user to a &quot;Thank You&quot; confirmation page.
                            </li>
                        </ol>
                    </div>
                </div>
            </section>

            <section>
                <h3 className="text-xl font-semibold mb-2">6. Deployment Considerations (Brief)</h3>
                <p className="text-gray-700">
                    For deployment, the Next.js application can be statically exported or deployed
                    to a platform that supports Node.js (like Vercel, Netlify for frontend). The
                    Express.js backend can be deployed to a Node.js hosting service (like Heroku,
                    AWS EC2, DigitalOcean). Both would need to communicate via their respective
                    public URLs.
                </p>
            </section>
        </div>
    );
}