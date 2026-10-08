export default {

    async fetch(request, env) {

        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        };


        /* =========================================
           OPTIONS
        ========================================= */

        if (request.method === "OPTIONS") {

            return new Response(null, {
                headers: corsHeaders
            });

        }


        /* =========================================
           TEST PAGE
        ========================================= */

        if (request.method === "GET") {

            return new Response(
                "Book Recommendation AI is running!",
                {
                    headers: {
                        "Content-Type": "text/plain",
                        ...corsHeaders
                    }
                }
            );

        }


        /* =========================================
           ONLY POST
        ========================================= */

        if (request.method !== "POST") {

            return new Response(
                "Method not allowed.",
                {
                    status: 405,
                    headers: corsHeaders
                }
            );

        }


        try {

            /* =========================================
               GET REQUEST DATA
            ========================================= */

            const body =
                await request.json();


            const userMessage =
                typeof body.message === "string"
                    ? body.message.trim()
                    : "";


            const searchHistory =
                Array.isArray(body.searchHistory)
                    ? body.searchHistory
                    : [];


            if (!userMessage) {

                return Response.json(
                    {
                        error:
                            "Please enter a message."
                    },
                    {
                        status: 400,
                        headers: corsHeaders
                    }
                );

            }


            /* =========================================
               PREVIOUS SEARCHES
            ========================================= */

            const previousSearches =
                searchHistory
                    .slice(0, 4)
                    .join("\n");


            /* =========================================
               AI SYSTEM PROMPT (FLAT KEYS TO STOP LOOPING)
            ========================================= */

   const systemPrompt = `
You are a book recommendation assistant.
Give exactly three recommendations of real, published books
that match the user's CURRENT request.
End the message in a complete sentence.
The message MUST NOT contain additional book recommendations.
Return exactly three books and no more.
`;


            /* =========================================
               USER PROMPT
            ========================================= */

            const userPrompt = `
CURRENT USER REQUEST:

========================================

${userMessage}

========================================

This is the request you must answer. Read the entire request before choosing three real published books.

${previousSearches
    ? `
PREVIOUS SEARCH HISTORY:
${previousSearches}

This history is only background context. It must NOT override the CURRENT USER REQUEST.
`
: ""}

Now answer the CURRENT USER REQUEST by providing exactly three books using the requested JSON format.
`;/* =========================================
           ASK CLOUDFLARE AI
        ========================================= */

      const aiResponse =
                await env.AI.run(
                    "@cf/meta/llama-3.1-8b-instruct",
                    {
                        messages: [
                            {
                                role: "system",
                                content: systemPrompt
                            },
                            {
                                role: "user",
                                content: userPrompt
                            }
                        ],
                        max_tokens: 300,  // <--- Razor-thin limit blocks 5 books entirely
                        temperature: 0.1, // <--- Lowered further to prevent creative rebellion
                        response_format: { type: "json_object" }
                    }
                );

        /* =========================================
           GET AI RESPONSE
        ========================================= */

        let aiText =
            aiResponse?.response || "";


        if (!aiText) {

            throw new Error(
                "The AI did not return a response."
            );

        }


        /* =========================================
           REMOVE MARKDOWN
        ========================================= */

        aiText =
            aiText
                .replace(
                    /```json/gi,
                    ""
                )
                .replace(
                    /```/g,
                    ""
                )
                .trim();


        /* =========================================
           FIND JSON
        ========================================= */

        const jsonStart =
            aiText.indexOf("{");


        const jsonEnd =
            aiText.lastIndexOf("}");


        if (
            jsonStart === -1 ||
            jsonEnd === -1
        ) {

            throw new Error(
                "The AI did not return valid JSON."
            );

        }


        const jsonText =
            aiText.substring(
                jsonStart,
                jsonEnd + 1
            );


        /* =========================================
           PARSE JSON
        ========================================= */

        let recommendation;

        try {

            recommendation =
                JSON.parse(jsonText);

        } catch (error) {

            console.error(
                "JSON PARSE ERROR:",
                error
            );

            throw new Error(
                "The AI returned invalid JSON."
            );

        }


        /* =========================================
           MAP FLAT KEYS TO CLEAN BOOK ARRAY
        ========================================= */

     const aiBooks = [
    {
        title: recommendation.book_one_title,
        author: recommendation.book_one_author,
    },
    {
        title: recommendation.book_two_title,
        author: recommendation.book_two_author,
    },
    {
        title: recommendation.book_three_title,
        author: recommendation.book_three_author,
    }
].filter(book => book && book.title && book.author);

if (aiBooks.length !== 3) {
    throw new Error(
        "The AI did not return exactly three valid books."
    );
}

        /* =========================================
           CLEAN AI MESSAGE
        ========================================= */

        const cleanedMessage =
            cleanMessage(
                recommendation.message
            );


        /* =========================================
           GOOGLE BOOKS
        ========================================= */

        const finalBooks = [];


        for (
            const aiBook of aiBooks
        ) {

            /* =====================================
               GOOGLE SEARCH
            ===================================== */

           const searchQuery =
    encodeURIComponent(
        `"${aiBook.title}" "${aiBook.author}"`
    );


            const googleURL =
                `https://www.googleapis.com/books/v1/volumes?q=${searchQuery}&maxResults=1&printType=books`;


            const googleResponse =
                await fetch(
                    googleURL
                );
  
		}


        /* =========================================
           FINAL BOOK LIST
        ========================================= */

        const books =
            finalBooks.slice(0, 3);


        /* =========================================
           RETURN RESULT
        ========================================= */

        return Response.json(
            {
                response:
                    cleanedMessage,

                books:
                    books
            },
            {
                headers: {
                    "Content-Type":
                        "application/json",

                    ...corsHeaders
                }
            }
        );


    } catch (error) {

        console.error(
            "Worker error:",
            error
        );


        return Response.json(
            {
                error:
                    "Something went wrong.",

                details:
                    error.message
            },
            {
                status:300,

                headers:
                    corsHeaders
            }
        );

    }

}
};

/* =========================================
CLEAN MAIN AI MESSAGE
========================================= */

function cleanMessage(text) {

if (!text) {

    return (
        "Here are three books that match your request."
    );

}


text =
    String(text)
        .replace(/\s+/g, " ")
        .trim();


if (!text) {

    return (
        "Here are three books that match your request."
    );

}


const lastSentenceEnd =
    Math.max(
        text.lastIndexOf("."),
        text.lastIndexOf("?"),
        text.lastIndexOf("!")
    );


if (
    lastSentenceEnd !== -1
) {

    return text
        .substring(
            0,
            lastSentenceEnd + 1
        )
        .trim();

}


return text + ".";
}
