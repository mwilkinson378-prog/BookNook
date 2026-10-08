const WORKER_URL = "https://book-recommendations.mwilkinson378.workers.dev/";

const messageInput = document.getElementById("message");
const askButton = document.getElementById("askButton");
const chatMessages = document.getElementById("chatMessages");
const bookRecommendations = document.getElementById("bookRecommendations");
const recentBooksContainer = document.getElementById("recentBooks");

let isRequesting = false;

function addMessage(text, type) {
    if (!chatMessages) {
        return;
    }

    const message = document.createElement("div");
    message.className = `message ${type}-message`;

    if (type === "ai") {
        message.innerHTML = `
            <div class="message-icon">
                ✦
            </div>
            <div class="message-content">
                <p></p>
            </div>
        `;
    } else {
        message.innerHTML = `
            <div class="message-content">
                <p></p>
            </div>
        `;
    }

    const paragraph = message.querySelector("p");
    paragraph.textContent = text || "";

    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
    if (!chatMessages) {
        return;
    }

    removeTyping();

    const typing = document.createElement("div");
    typing.className = "message ai-message typing";
    typing.id = "typing";

    typing.innerHTML = `
        <div class="message-icon">
            ✦
        </div>
        <div class="message-content-finding">
            <p>Finding the perfect books for you…</p>
        </div>
    `;

    chatMessages.appendChild(typing);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTyping() {
    const typing = document.getElementById("typing");

    if (typing) {
        typing.remove();
    }
}

function saveSearch(search) {
    if (!search || !search.trim()) {
        return;
    }

    let searches = [];

    try {
        searches = JSON.parse(
            localStorage.getItem("bookSearchHistory") || "[]"
        );

        if (!Array.isArray(searches)) {
            searches = [];
        }
    } catch {
        searches = [];
    }

    const cleanSearch = search.trim();

    searches = searches.filter(item => {
        if (!item || typeof item.text !== "string") {
            return false;
        }

        return item.text.toLowerCase() !== cleanSearch.toLowerCase();
    });

    searches.unshift({
        text: cleanSearch,
        date: Date.now()
    });

    searches = searches.slice(0, 4);

    localStorage.setItem(
        "bookSearchHistory",
        JSON.stringify(searches)
    );
}

function getSearchHistory() {
    try {
        const history = JSON.parse(
            localStorage.getItem("bookSearchHistory") || "[]"
        );

        if (Array.isArray(history)) {
            return history;
        }
    } catch (error) {
        console.error("Could not load search history:", error);
    }

    return [];
}

async function askAI(text) {
    if (!text || !text.trim()) {
        return;
    }

    if (isRequesting) {
        return;
    }

    isRequesting = true;

    const cleanText = text.trim();

    const oldSearchHistory = getSearchHistory();

    const previousSearches = oldSearchHistory
        .slice(0, 4)
        .map(item => item.text);

    addMessage(cleanText, "user");

    saveSearch(cleanText);

    if (messageInput) {
        messageInput.value = "";
        messageInput.style.height = "auto";
    }

    if (askButton) {
        askButton.disabled = true;
    }

    showTyping();

    try {
        const response = await fetch(
            WORKER_URL,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: cleanText,
                    searchHistory: previousSearches
                })
            }
        );

        const rawResponse = await response.text();

        console.log("Worker response:", rawResponse);

        removeTyping();

        if (!response.ok) {
            let errorMessage =
                "The recommendation assistant returned an error.";

            try {
                const errorData = JSON.parse(rawResponse);

                errorMessage =
                    errorData.error ||
                    errorData.details ||
                    errorMessage;
            } catch {
                if (rawResponse) {
                    errorMessage = rawResponse;
                }
            }

            addMessage(errorMessage, "ai");
            return;
        }

        let data;

        try {
            data = JSON.parse(rawResponse);
        } catch (error) {
            console.error("Invalid JSON from Worker:", error);

            addMessage(
                "The recommendation assistant returned an invalid response. Please try again.",
                "ai"
            );

            return;
        }

        console.log("AI + Google Books data:", data);

        if (
            data.response &&
            typeof data.response === "string"
        ) {
            addMessage(
                cleanAIMessage(data.response),
                "ai"
            );
        } else {
            addMessage(
                "Here are three books that match your request.",
                "ai"
            );
        }

        if (
            !Array.isArray(data.books) ||
            data.books.length === 0
        ) {
            console.warn(
                "Worker returned no books:",
                data
            );

            return;
        }

        const books = data.books
            .filter(book => book && book.title)
            .slice(0, 4);

        if (!books.length) {
            return;
        }

        displayRecommendedBooks(books);
        saveRecentRecommendations(books);

    } catch (error) {
        removeTyping();

        console.error(
            "Recommendation error:",
            error
        );

        addMessage(
            "I couldn't connect to the recommendation assistant. Please try again.",
            "ai"
        );

    } finally {
        isRequesting = false;

        if (askButton) {
            askButton.disabled = false;
        }
    }
}

function cleanAIMessage(text) {
    if (!text) {
        return "Here are three books that match your request.";
    }

    let message = String(text)
        .replace(/\s+/g, " ")
        .trim();

    if (!message) {
        return "Here are three books that match your request.";
    }

    message = message
        .replace(/^["']|["']$/g, "")
        .trim();

    const lastPeriod = message.lastIndexOf(".");
    const lastQuestion = message.lastIndexOf("?");
    const lastExclamation = message.lastIndexOf("!");

    const lastSentenceEnd = Math.max(
        lastPeriod,
        lastQuestion,
        lastExclamation
    );

    if (lastSentenceEnd >= 0) {
        return message
            .substring(0, lastSentenceEnd + 1)
            .trim();
    }

    return message + ".";
}

if (askButton) {
    askButton.addEventListener(
        "click",
        () => {
            if (!messageInput) {
                return;
            }

            const text = messageInput.value.trim();

            if (!text) {
                return;
            }

            askAI(text);
        }
    );
}

function displayRecommendedBooks(books) {
    if (!bookRecommendations) {
        console.error(
            "bookRecommendations element was not found."
        );

        return;
    }

    const threeBooks = books
        .filter(book => book && book.title)
        .slice(0, 4);

    bookRecommendations.innerHTML = "";

    if (!threeBooks.length) {
        bookRecommendations.innerHTML = `
            <p class="no-recommendations">
                No books were found for this request.
            </p>
        `;

        return;
    }

    threeBooks.forEach(book => {
        const card = document.createElement("article");
        card.className = "book-card";

        const title = book.title || "Unknown title";
        const author = book.author || "Unknown author";
        const cover =
            book.cover ||
            "https://via.placeholder.com/300x450?text=No+Cover";

        card.innerHTML = `
            <div class="book-cover">
                <img
                    src="${escapeHTML(cover)}"
                    alt="Cover of ${escapeHTML(title)}"
                    loading="lazy"
                >
            </div>

            <div class="book-information">
                <p class="book-label">
                    RECOMMENDED FOR YOU
                </p>

                <h3 class="book-title">
                    ${escapeHTML(title)}
                </h3>

                <p class="author">
                    ${escapeHTML(author)}
                </p>

                ${
                    book.reason
                        ? `
                            <div class="book-reason">
                                <strong>
                                    Why I picked it
                                </strong>

                                <p>
                                    ${escapeHTML(
                                        cleanBookReason(book.reason)
                                    )}
                                </p>
                            </div>
                        `
                        : ""
                }

                ${
                    book.description
                        ? `
                            <div class="book-description">
                                <strong>
                                    About the book
                                </strong>

                                <p>
                                    ${escapeHTML(
                                        shortenDescription(book.description)
                                    )}
                                </p>
                            </div>
                        `
                        : ""
                }

                <div class="book-details">
                    ${
                        book.rating
                            ? `
                                <span>
                                    ★ ${escapeHTML(
                                        String(book.rating)
                                    )}
                                </span>
                            `
                            : ""
                    }

                    ${
                        book.pageCount
                            ? `
                                <span>
                                    ${escapeHTML(
                                        String(book.pageCount)
                                    )} pages
                                </span>
                            `
                            : ""
                    }

                    ${
                        book.publishedDate
                            ? `
                                <span>
                                    ${escapeHTML(
                                        String(book.publishedDate)
                                    )}
                                </span>
                            `
                            : ""
                    }
                </div>

                ${
                    book.previewLink
                        ? `
                            <a
                                class="book-preview-button"
                                href="${escapeHTML(
                                    book.previewLink
                                )}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Preview Book
                            </a>
                        `
                        : ""
                }
            </div>
        `;

        bookRecommendations.appendChild(card);
    });

    const recommendationsSection =
        document.getElementById("recommendations");

    if (recommendationsSection) {
        recommendationsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

function cleanBookReason(text) {
    if (!text) {
        return "";
    }

    let reason = String(text)
        .replace(/\s+/g, " ")
        .trim();

    if (!reason) {
        return "";
    }

    const match = reason.match(/^.*?[.!?](?:\s|$)/);

    if (match) {
        return match[0].trim();
    }

    return reason + ".";
}

function shortenDescription(description) {
    if (!description) {
        return "";
    }

    const cleanDescription = String(description)
        .replace(/\s+/g, " ")
        .trim();

    const maxLength = 350;

    if (cleanDescription.length <= maxLength) {
        return cleanDescription;
    }

    return (
        cleanDescription
            .substring(0, maxLength)
            .trim() + "…"
    );
}

function saveRecentRecommendations(books) {
    if (!Array.isArray(books) || !books.length) {
        return;
    }

    let existing = [];

    try {
        existing = JSON.parse(
            localStorage.getItem(
                "recentRecommendations"
            ) || "[]"
        );

        if (!Array.isArray(existing)) {
            existing = [];
        }
    } catch {
        existing = [];
    }

    const newBooks = books
        .filter(book => book && book.title)
        .slice(0, 4)
        .map(book => ({
            id:
                book.id ||
                `${book.title}-${book.author || ""}`,
            title: book.title,
            author: book.author || "Unknown author",
            cover: book.cover || ""
        }));

    const combined = [
        ...newBooks,
        ...existing
    ];

    const unique = [];

    combined.forEach(book => {
        if (!book || !book.title) {
            return;
        }

        const bookKey =
            `${book.title}-${book.author || ""}`
                .toLowerCase()
                .trim();

        const alreadyExists = unique.some(
            existingBook => {
                const existingKey =
                    `${existingBook.title}-${existingBook.author || ""}`
                        .toLowerCase()
                        .trim();

                return existingKey === bookKey;
            }
        );

        if (!alreadyExists) {
            unique.push(book);
        }
    });

    localStorage.setItem(
        "recentRecommendations",
        JSON.stringify(unique.slice(0, 4))
    );

    loadRecentRecommendations();
}

function escapeHTML(value) {
    const div = document.createElement("div");

    div.textContent =
        value == null
            ? ""
            : String(value);

    return div.innerHTML;
}

if (messageInput) {
    messageInput.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {
                event.preventDefault();

                const text =
                    messageInput.value.trim();

                if (!text) {
                    return;
                }

                askAI(text);
            }
        }
    );
}

if (messageInput) {
    messageInput.addEventListener(
        "input",
        () => {
            messageInput.style.height = "auto";

            messageInput.style.height =
                Math.min(
                    messageInput.scrollHeight,
                    140
                ) + "px";
        }
    );
}

const suggestionButtons =
    document.querySelectorAll(
        ".suggestion-button"
    );

suggestionButtons.forEach(
    button => {
        button.addEventListener(
            "click",
            () => {
                const prompt =
                    button.dataset.prompt;

                if (
                    !messageInput ||
                    !prompt
                ) {
                    return;
                }

                messageInput.value = prompt;
                messageInput.focus();
                messageInput.style.height = "auto";

                messageInput.style.height =
                    Math.min(
                        messageInput.scrollHeight,
                        140
                    ) + "px";
            }
        );
    }
);

function loadRecentRecommendations() {
    if (!recentBooksContainer) {
        return;
    }

    let savedBooks = [];

    try {
        savedBooks = JSON.parse(
            localStorage.getItem(
                "recentRecommendations"
            ) || "[]"
        );

        if (!Array.isArray(savedBooks)) {
            savedBooks = [];
        }
    } catch {
        savedBooks = [];
    }

    if (!savedBooks.length) {
        recentBooksContainer.innerHTML = `
            <div class="recent-empty">
                Your recently recommended books
                will appear here.
            </div>
        `;

        return;
    }

    recentBooksContainer.innerHTML =
        savedBooks
            .slice(0, 4)
            .map(
                book => `
                    <article class="recent-book">
                        <div class="recent-book-cover">
                            <img
                                src="${escapeHTML(
                                    book.cover || ""
                                )}"
                                alt="Cover of ${escapeHTML(
                                    book.title || ""
                                )}"
                                loading="lazy"
                            >
                        </div>

                        <div class="recent-book-info">
                            <div class="recent-book-title">
                                ${escapeHTML(
                                    book.title || ""
                                )}
                            </div>

                            <div class="recent-book-author">
                                ${escapeHTML(
                                    book.author ||
                                    "Unknown author"
                                )}
                            </div>
                        </div>
                    </article>
                `
            )
            .join("");
}

loadRecentRecommendations();