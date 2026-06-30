## Prompting Tool
This tool helps make prompt engineering easier by adding autocomplete, search, and update support for custom agent tools and variables.

Instead of writing everything manually in plain text, product and design teams can quickly find the right tool names, variables, and formats. This helps reduce mistakes, avoid inconsistent prompts, and make updates easier when internal tools or architectures change.

## How to Use

### Step 1: Add a Source

Paste the JSON structure that contains your custom tool information.
After adding it, the tool will parse the JSON and show the available tools in a structured view.

#### Example JSON Structure:
The JSON should contain a functions array. Each function can include details such as the tool name, request method, endpoint, parameters, description, response mapping, or client action template.

```json

{
  "functions": [
    {
      "name": "search_directory",
      "method": "GET",
      "endpoint": "/search",
      "parameters": {
        "q": {
          "type": "string",
          "required": true,
          "description": "Search terms"
        }
      },
      "description": "Search for places in the campus by name or category"
    },
    {
      "name": "open_place_detail",
      "parameters": {
        "place_id": {
          "type": "string",
          "required": true,
          "description": "Place ID"
        }
      },
      "description": "Open the detail view for a specific place",
      "execution_type": "client_action",
      "response_template": {
        "action": "nav:openPlace",
        "place_id": "{{place_id}}"
      }
    }
  ]
}

```


### Step 2: Build Variable Groups

Create group names or variables based on how you want to organize your tools.
Then drag and drop tool names from the parsed source into the correct group.

### Step 3: Use the Prompt Editor

Go to the Prompt Editor tab.
You will see the groups and variables you created. You can also explore where each item is used in the prompt.
To add a tool inside the editor, type '/' and start typing the tool name. Select the tool from the list to insert it.
You can click on a tool name to view its required parameters.


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
