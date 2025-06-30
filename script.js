document.addEventListener("DOMContentLoaded", function () {

    // Global variables
    let editor;
    let lastScore = null;
    let initialCode = "";
    let selectedTopic = "";
    let selectedDifficulty = "";
    let currentGenerationId = 0;
    let codeWasSubmitted = false;

    // DOM elements
    const backBtn = document.getElementById("backBtn");
    const hintBtn = document.getElementById("hintBtn");
    const mainPage = document.getElementById("mainPage");
    const topicSearch = document.getElementById("topicSearch");
    const topicBoxes = document.querySelectorAll(".topic-box");
    const generateBtn = document.getElementById("generateBtn");
    const problemPage = document.getElementById("problemPage");
    const problemText = document.getElementById("problemText");
    const hintSection = document.getElementById("hintSection");
    const submitCodeBtn = document.getElementById("submitCode");
    const problemTitle = document.getElementById("problemTitle");
    const newQuestionBtn = document.getElementById("newQuestion");
    const selectionPage = document.getElementById("selectionPage");
    const customTopicBtn = document.getElementById("customTopicBtn");
    const customTopicInput = document.getElementById("customTopicInput");
    const difficultySelect = document.getElementById("difficultySelect");
    const addCustomTopicBtn = document.getElementById("addCustomTopicBtn");
    const customTopicInputWrapper = document.getElementById("customTopicInputWrapper");

    // Handles visibility of custom topic input when button is clicked
    if (customTopicBtn) {
        customTopicBtn.addEventListener("click", () => {
            customTopicInputWrapper.classList.toggle("visible");
            if (customTopicInputWrapper.classList.contains("visible")) {
                customTopicInput.focus();
            }
        });
    }

    // adds a new custom topic to the topic grid
    if (addCustomTopicBtn) {
        addCustomTopicBtn.addEventListener("click", () => {
            const newTopic = customTopicInput.value.trim();
            if (newTopic) {
                const newBox = document.createElement("div");
                newBox.className = "topic-box";
                newBox.textContent = newTopic;
                makeTopicSelectable(newBox, newTopic);
                document.querySelector(".topics-grid").appendChild(newBox);
                customTopicInput.value = "";
                customTopicInputWrapper.classList.remove("visible");
            }
        });
    }

    // Highlight topic boxes based on search input
    if (topicSearch) {
        topicSearch.addEventListener("input", function () {
            const query = topicSearch.value.toLowerCase();
            document.querySelectorAll(".topic-box").forEach(box => {
                const text = box.textContent.toLowerCase();
                if (query && text.includes(query) && !box.classList.contains("active")) {
                    box.classList.add("highlighted");
                } else {
                    box.classList.remove("highlighted");
                }
            });
        });
    }

    // Adds click behavior to a topic box, making it selectable
    function makeTopicSelectable(box, topicName) {
        box.addEventListener("click", function () {
            document.querySelectorAll(".topic-box").forEach((b) => {
                b.classList.remove("active");
                b.classList.remove("highlighted");
            });
            box.classList.add("active");
            selectedTopic = topicName;
        });
    }

    topicBoxes.forEach((box) => makeTopicSelectable(box, box.textContent));

    // Initializes the CodeMirror editor
    function initEditor() {
        if (!editor) {
            editor = CodeMirror.fromTextArea(document.getElementById("codeEditor"), {
                lineNumbers: true,
                lineWrapping: true,
                mode: "python",
                theme: "material-darker",
                indentUnit: 4,
                tabSize: 4,
            });
        }
    }

    // Clears the content inside the CodeMirror editor
    function clearEditor() {
        if (editor) editor.setValue("");
    }

    // Dynamically generate new Problem based on user selection of topic and difficulty
    async function fetchProblem(topic, difficulty) {
        const prompt = `You are a DSA tutor assistant. Your job is to generate clear, self-contained, and language-independent coding problems for students.  
Based on the selected topic and difficulty below:
- Topic: ${topic}
- Difficulty: ${difficulty}

Your task is to generate a **new and unique** problem for this topic and difficulty level. 
- Avoid repeating problems that have already been generated for this session.
- Ensure each problem tests a **different variation, edge case, or logical aspect** of the topic.

Generate a coding question that follows this exact structure:
---
Title: [A clear and concise problem title]

Problem Statement:  
[A fully self-contained explanation of the task.  
Define what the input is, what the output should be, and what the student is expected to compute.]

Input Format:  
[A structured explanation of the input. Clearly define all variables, types, and any assumptions.]

Output Format:  
[A clear description of the output format. Specify type, structure, and expectations.]

Examples:  
Provide **exactly three examples** of input and expected output.
Each example should cover:
- Typical use case
- Edge case (e.g., empty input, min/max values)
- Trickier logic case (e.g., multiple valid paths, nested structures)

For each example, format like this:

**Example N**
Input:
<example input>

Output:
<expected output>

Explanation:  
<how the output was derived from the input>

Constraints:  
[List all relevant constraints such as input size limits, value ranges, and edge case expectations.]

Hints:  
Now provide exactly **three** hints to help a student solve the problem, **without giving away the full solution**:
1. For easy: detailed and step-by-step guiding hints. For moderate: concise conceptual nudges. For difficult: abstract and strategic clues.
2. Focus on mistakes commonly made on this type of problem or misconceptions students often have.
3. Offer a conceptual pointer, analogy, or helpful principle — **not code**, **not the answer**.
---`;

        // Body for the API call
        const body = {
            prompt,
            max_new_tokens: 1800,
            temperature: 0.7,
            top_p: 0.95,
        };

        // POST Request to local server
        const resp = await fetch("http://localhost:8000/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        // Raw Response
        const raw = await resp.text();
        console.log("[/generate] status:", resp.status, "| raw response preview:", raw.slice(0, 300));

        if (!resp.ok) throw new Error(`API Error ${resp.status}: ${raw}`);

        // extract the problem block (without hints) from the raw output
        const extractProblemBlock = (text) => {
            const parts = text.split('---').map(p => p.trim()).filter(Boolean);
            const validBlocks = parts.filter(p => p.includes('Title:') && p.includes('Constraints:'));
            if (validBlocks.length === 0) throw new Error("No valid problem block found.");
            const block = validBlocks[validBlocks.length - 1];
            const exampleCount = (block.match(/\*\*Example \d+/g) || []).length;
            if (exampleCount !== 3) throw new Error(`Expected 3 examples, found ${exampleCount}.`);
            const truncated = block.split(/Hints:/)[0].trim();
            return truncated;
        };

        // extract the 3 numbered hints
        const extractHints = (text) => {
            const lastHintsIndex = text.lastIndexOf("Hints:");
            if (lastHintsIndex === -1) return [];
            const rawHintText = text
                .slice(lastHintsIndex + 6)
                .replace(/---[\s\S]*/g, "")
                .trim();

            const numberedHints = rawHintText
                .split(/\n?\d+\.\s+/)            
                .map(h => h.trim())
                .filter(h => h.length > 4 && !/^\*+$/.test(h));

            return numberedHints.slice(0, 3);
        };

        try {
            // Try parsing the model's response as JSON
            const json = JSON.parse(raw);
            const fullText = json.completion ?? json.generated_text ?? raw;
            const problem = extractProblemBlock(fullText);
            const hintLines = extractHints(fullText);
            return { problem, hints: hintLines };
        } catch (err) {
            // If response is not JSON or parsing fails, return raw problem text with no hints
            console.warn("Parsing error:", err.message);
            return { problem: raw, hints: [] };
        }
    }

    // Display a newly generated problem, with difficulty auto-adjustment and hint integration
    async function displayProblem(thisGenerationId) { 
        if (!editor) initEditor();

        setTimeout(() => {
            if (editor && !editor._changeListenerAdded) {
                editor._changeListenerAdded = true;
            }
        }, 0);

        try {
            // Auto-adjust difficulty based on last score
            const levels = ["easy", "moderate", "difficult"];
            let currentIndex = levels.indexOf(selectedDifficulty);
            if (currentIndex === -1) currentIndex = 1;
            const previous = selectedDifficulty;

            if (lastScore !== null) {
                if (lastScore <= 4 && currentIndex > 0) {
                    currentIndex -= 1; // Drop Difficulty
                } else if (lastScore >= 7 && currentIndex < levels.length - 1) {
                    currentIndex += 1; // Increrase Difficulty
                }
                selectedDifficulty = levels[currentIndex];

                // Notify user if difficulty was changed
                if (selectedDifficulty !== previous) {
                    alert(`📈 Difficulty adjusted to "${selectedDifficulty.toUpperCase()}" based on your last score.`);
                }
            }

            // Set page and problem titles
            const titleText = `${selectedTopic} - ${selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}`;
            document.getElementById("pageTitle").textContent = `Solving: ${titleText}`;
            problemTitle.textContent = titleText;

            const { problem, hints } = await fetchProblem(selectedTopic, selectedDifficulty);
            if (thisGenerationId !== currentGenerationId) {
                console.warn("⚠️ Outdated problem discarded");
                return;
            }
            problemTitle.textContent = `${selectedTopic} - ${selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}`;
            problemText.textContent = problem;
            clearEditor();
            initialCode = editor.getValue();

            // Show hint, new question and submit code buttons
            hintBtn.style.display = "inline-block";
            newQuestionBtn.style.display = "inline-block";
            submitCodeBtn.style.display = "inline-block";

            hintSection.style.display = "none";
            hintBtn.textContent = "Show Hint";
            hintSection.innerHTML = "";

            // Makes each hint as a dropdown / collapsible element
            hints.forEach((hint, index) => {
                const detail = document.createElement("details");
                const summary = document.createElement("summary");
                summary.textContent = `Hint ${index + 1}`;
                const para = document.createElement("p");
                para.textContent = hint;
                detail.appendChild(summary);
                detail.appendChild(para);
                hintSection.appendChild(detail);
            });
        } catch (err) {
            console.error(err);
            problemText.textContent = "❌ Error: Could not generate problem.";
        }
    }

    // Handle problem generation when the "Generate" button is clicked
    generateBtn.addEventListener("click", async function () {
        selectedDifficulty = difficultySelect.value;
        lastScore = null;

        const scoreBadge = document.getElementById("scoreBadge");
        if (scoreBadge) {
            scoreBadge.style.display = "none";
            scoreBadge.innerHTML = "";
        }

        const activeTile = document.querySelector(".topic-box.active");
        selectedTopic = activeTile ? activeTile.textContent : "";
        selectedDifficulty = difficultySelect.value;

        if (!selectedTopic || !selectedDifficulty) {
            alert("Please select a topic and a difficulty level.");
            return;
        }

        currentGenerationId += 1;
        const thisGenerationId = currentGenerationId;

        // Build and set the problem title/subtitle in the UI
        const titleText = `${selectedTopic} - ${selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}`;
        document.getElementById("pageTitle").textContent = `Solving: ${titleText}`;
        document.getElementById("pageSubtitle").textContent = "Tackle this challenge and test your skills!";

        // Display loading state while problem is being fetched
        problemTitle.textContent = titleText;
        problemText.textContent = "⏳ Generating problem...";
        clearEditor();

        // Transition from topic selection to problem page
        selectionPage.style.display = "none";
        problemPage.style.display = "block";

        // Hide interactive buttons until problem and hints are ready
        hintBtn.style.display = "none";
        newQuestionBtn.style.display = "none";
        submitCodeBtn.style.display = "none";
        hintSection.style.display = "none";
        hintBtn.textContent = "Show Hint";

        await displayProblem(thisGenerationId);
    });

    // Generates new question for same topic and difficulty level
    newQuestionBtn.addEventListener("click", function () {
        if (!codeWasSubmitted) {
            lastScore = null;
        }
        codeWasSubmitted = false;
        document.getElementById("feedbackSection").style.display = "none";
        document.getElementById("toggleFeedbackBtn").style.display = "none";
        submitCodeBtn.disabled = false;
        const scoreBadge = document.getElementById("scoreBadge");
        if (scoreBadge) {
            scoreBadge.style.display = "none";
            scoreBadge.innerHTML = "";
        }
        if (!selectedTopic || !selectedDifficulty) {
            alert("No topic/difficulty selected.");
            return;
        }
        currentGenerationId += 1;
        const thisGenerationId = currentGenerationId;
        const titleText = `${selectedTopic} - ${selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}`;
        document.getElementById("pageTitle").textContent = `Solving: ${titleText}`;
        document.getElementById("pageSubtitle").textContent = "Tackle this challenge and test your skills!";
        problemTitle.textContent = titleText;
        problemText.textContent = "⏳ Generating problem...";
        clearEditor();
        hintBtn.style.display = "none";
        newQuestionBtn.style.display = "none";
        submitCodeBtn.style.display = "none";
        hintSection.style.display = "none";
        hintBtn.textContent = "Show Hint";
        displayProblem(thisGenerationId);
    });

    // Back Button takes you to main page for topic and difficulty selection
    backBtn.addEventListener("click", function () {
        document.getElementById("feedbackSection").style.display = "none";
        document.getElementById("toggleFeedbackBtn").style.display = "none";
        submitCodeBtn.disabled = false;
        document.getElementById("pageTitle").textContent = "Programming Practice";
        document.getElementById("pageSubtitle").textContent = "Select a topic and difficulty level to generate a new problem.";
        hintSection.style.display = "none";
        hintBtn.textContent = "Show Hint";
        clearEditor();
        problemPage.style.display = "none";
        selectionPage.style.display = "block";
    });

    // Toggle the visibility of the hint section when the "Hint" button is clicked
    hintBtn.addEventListener("click", function () {
        const isHidden = hintSection.style.display === "none" || hintSection.style.display === "";
        hintSection.style.display = isHidden ? "block" : "none";
        hintBtn.textContent = isHidden ? "Hide Hint" : "Show Hint";
    });

    // Toggle visibility of the feedback section when "Show/Hide Feedback" is clicked
    document.getElementById("toggleFeedbackBtn").addEventListener("click", function () {
        const feedbackBox = document.getElementById("feedbackSection");
        const isVisible = feedbackBox.style.display === "block";

        if (isVisible) {
            feedbackBox.style.display = "none";
            this.textContent = "Show Feedback";
            submitCodeBtn.disabled = false;
        } else {
            feedbackBox.style.display = "block";
            this.textContent = "Hide Feedback";
            submitCodeBtn.disabled = false;
        }
    });

    // Checks if block of text written in code editor is actually a code or not
    function isProbablyCode(text) {
        const lines = text.trim().split("\n").filter(l => l.trim().length > 0);
        if (lines.length < 2) return false;

        let codeLikeCount = 0;
        let commentOnlyCount = 0;
        let naturalLanguageCount = 0;

        for (let line of lines) {
            const trimmed = line.trim();

            // Count lines that look like comments (single-line or doc-style)
            if (/^(\s*)?(#|\/\/|\/\*|\*|\*)/.test(trimmed)) {
                commentOnlyCount++;
            }

            // Count lines that appear to be natural language (e.g., English prose)
            if (/[.?!]$/.test(trimmed) && /\b(the|this|that|should|after|before|each|begin|step)\b/i.test(trimmed)) {
                naturalLanguageCount++;
            }

            // Count lines that contain code-like tokens or syntax
            if (/[{();=}]|function|class|def|let|const|var|return|<|>/.test(trimmed)) {
                codeLikeCount++;
            }
        }

        // Compute ratios of code, comments, and natural text
        const codeRatio = codeLikeCount / lines.length;
        const commentRatio = commentOnlyCount / lines.length;
        const naturalTextRatio = naturalLanguageCount / lines.length;

        // Heuristic rule: code should dominate, but not be overwhelmed by comments or prose
        return (
            codeRatio > 0.3 && // At least 30% of lines must look like code
            commentRatio < 0.6 && // Less than 60% comments
            naturalTextRatio < 0.5 // Less than 50% natural language
        );
    }

    // Submits code for evaluation / analysis  and feedback generation
    submitCodeBtn.addEventListener("click", async function () {
        const currentCode = editor.getValue();

        if (!currentCode.trim()) {
            alert("⚠️ Your editor is empty. Please write or paste your code before submitting.");
            return;
        }

        if (!isProbablyCode(currentCode)) {
            alert("⚠️ This doesn't look like valid source code. Please write code in any programming language before submitting.");
            return;
        }

        if (currentCode === initialCode) {
            alert("⚠️ You haven’t changed the code since your last submission.");
            return;
        }

        submitCodeBtn.disabled = true;
        const scoreBadge = document.getElementById("scoreBadge");
        if (scoreBadge) {
            scoreBadge.style.display = "none";
            scoreBadge.innerHTML = "";
        }

        const feedbackBox = document.getElementById("feedbackSection");
        const feedbackContent = document.getElementById("feedbackContent");
        const hintBox = document.getElementById("hintSection");
        const hintBtn = document.getElementById("hintBtn");
        const toggleFeedbackBtn = document.getElementById("toggleFeedbackBtn");

        // Show feedback section with a loading message
        feedbackBox.style.display = "block";
        feedbackContent.innerHTML = `<em>🕐 Evaluating code...</em>`;
        toggleFeedbackBtn.style.display = "none";

        const problem = problemText.textContent;

        // prompt to send code and problem to LLM for evaluation
        const evaluationPrompt = `
        You are an expert AI tutor evaluating a student's code submission.

        Here is the problem the student is trying to solve:
        """
        ${problem}
        """

        Here is the student's submitted code (ignore all comments and docstrings):
        \\code
        ${currentCode}
        \\

        Your task is to critically and constructively evaluate the code by answering:
        1. Does the code attempt to solve the **specific problem described above**? Be strict — if it solves a different problem or is only partially aligned, do not give full credit.
        2. Does the code use the **correct algorithm or approach**? If a specific algorithm is expected (e.g., insertion sort), make sure the logic matches its definition — e.g., shifting not swapping.
        3. Are there any **logical flaws, boundary bugs, or incorrect loop conditions**? Identify them clearly.
        4. Comment on **efficiency**, but emphasize **correctness** first. If inefficiency leads to incorrect behavior (e.g., wrong algorithm structure), highlight it as a logic issue.
        5. Suggest **at least one test case** (e.g., sorted, reverse, duplicates) where the student’s code might fail.
        6. Do not say the code is "almost correct" if the main logic or algorithm is wrong. Be honest.
        7. Offer constructive, actionable suggestions without giving the full solution.

        Respond using this exact format (no extra sections):
        === BEGIN FEEDBACK ===

        ✅ Logic & Correctness:
        - [Clearly state whether the logic is correct and solves the actual problem.]

        ⚠️ Suggestions for Improvement:
        1. [Highlight algorithmic or logical flaws.]
        2. [Call out edge case or structure issues.]
        3. [Suggest ways to align the code with the correct approach.]

        💡 Scaffolding Hint:
        - [Give a directional hint toward the correct logic or strategy — not the code itself.]
        🔢 Code Score: [X/10]

        === END FEEDBACK ===
        `;

        const body = {
            prompt: evaluationPrompt,
            max_new_tokens: 900,
            temperature: 0.6,
            top_p: 0.95
        };

        try {
            // POST Call the LLM server to evaluate the submission
            const resp = await fetch("http://localhost:8000/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const raw = await resp.text();
            console.log("🧪 Raw response text:\n", raw);

            const json = JSON.parse(raw);
            let feedback = json.feedback ?? json.generated_text ?? raw;

            // Extract feedback block using delimiters
            const start = feedback.lastIndexOf("=== BEGIN FEEDBACK ===");
            const end = feedback.lastIndexOf("=== END FEEDBACK ===");

            if (start !== -1 && end !== -1 && end > start) {
                feedback = feedback.slice(start + "=== BEGIN FEEDBACK ===".length, end).trim();
            } else {
                alert("⚠️ Could not find proper feedback markers in the response.");
                console.warn("🧪 Raw feedback (no slice):", feedback);
            }

            console.log("✅ Extracted Feedback:\n", feedback);

            // Parse feedback into sections
            feedback = feedback.replace(/\\n/g, "\n");
            const lines = feedback.split("\n").map(l => l.trim()).filter(Boolean);

            let section = "", logic = "", improvements = [], hint = "", score = "";

            for (const line of lines) {
                if (/^\d{1,2}\/10$/.test(line.trim())) continue;

                if (/Logic & Correctness/i.test(line)) {
                    section = "logic";
                    continue;
                } else if (/Suggestions for Improvement/i.test(line)) {
                    section = "improve";
                    continue;
                } else if (/Scaffolding Hint/i.test(line)) {
                    section = "hint";
                    continue;
                } else if (/Code Score/i.test(line)) {
                    section = "score";
                    const match = line.match(/Code Score:\s*\[?(\d{1,2})\/10\]?/i);
                    if (match) {
                    score = match[1];
                    lastScore = parseInt(score);
                    console.log("✅ Extracted score:", score);
                    }
                    section = null;
                    continue;
                }

                if (/^(✅|⚠️|💡|🔢)/.test(line)) continue;

                if (section === "logic") {
                    logic += line + " ";
                } else if (section === "improve") {
                    const match = line.match(/^\d+\.\s*(.+)$/);
                    improvements.push(match ? match[1] : line);
                } else if (section === "hint") {
                    hint += line + " ";
                }
            }

            // Build HTML sections for display
            const logicHTML = logic ? `<h4>✅ Logic & Correctness:</h4><p>${logic.trim()}</p>` : "";
            const improvementsHTML = improvements.length
            ? `<h4>⚠️ Suggestions for Improvement:</h4><ul>${improvements.map(i => `<li>${i}</li>`).join("")}</ul>` : "";
            const hintHTML = hint ? `<h4>💡 Scaffolding Hint:</h4><p>${hint.trim()}</p>` : "";
            const scoreHTML = score ? `<h4>🎯 Code Score:</h4><p><strong>${score}/10</strong></p>` : "";

            const scoreBadge = document.getElementById("scoreBadge");

            // style score badge
            if (score && scoreBadge) {
                const numericScore = parseInt(score);
                let color = "#444";
                if (numericScore >= 8) color = "#2e7d32";         // Green for high score
                else if (numericScore >= 5) color = "#f9a825";    // Orange for medium score
                else color = "#d32f2f";                           // Red for low score 

                scoreBadge.style.cssText = `
                background-color: #fff3cd;
                color: ${color};
                font-weight: 600;
                padding: 8px 16px;
                font-size: 15px;
                border-radius: 6px;
                box-shadow: 0 1px 2px rgba(0,0,0,0.08);
                display: inline-flex;
                align-items: center;
                gap: 6px;
                height: 38px;
                min-width: 120px;
                justify-content: center;
                `;

                scoreBadge.style.display = "inline-flex";
                scoreBadge.innerHTML = `
                    <span style="display: flex; align-items: center; gap: 6px; color: ${color};">
                    🎯 <span>Score: <strong>${numericScore}/10</strong></span>
                    </span>`;
            } else if (scoreBadge) {
                scoreBadge.style.display = "none"; 
                scoreBadge.innerHTML = "";         
            }

            // Inject the final feedback into the UI
            feedbackContent.innerHTML = `
            <div class="feedback-block">
                ${logicHTML}
                ${improvementsHTML}
                ${hintHTML}
            </div>
            `;

            toggleFeedbackBtn.style.display = "inline-block";
            toggleFeedbackBtn.textContent = "Hide Feedback";

            // Labels Hint Button
            if (hintBtn && hintBox.style.display === "block") {
                hintBtn.textContent = "Hide Hint";
            } else if (hintBtn) {
                hintBtn.textContent = "Show Hint";
            }

            initialCode = currentCode;
            codeWasSubmitted = true;

        } catch (err) {
            alert("❌ Evaluation failed:\n" + err.message);
        } finally {
            submitCodeBtn.disabled = false;
        }
    });

    // Deselect active topic tiles when clicking outside the selection area
    document.addEventListener("click", function (event) {
        setTimeout(() => {
            const clickedInsideTile = event.target.closest(".topic-box");
            const clickedGenerate = event.target.closest("#generateBtn");
            const clickedDropdown = event.target.closest("#difficultySelect");

            // If the click was outside all relevant UI elements and the selection page is visible, deselect all topic boxes
            if (!clickedInsideTile && !clickedGenerate && !clickedDropdown && selectionPage.style.display !== "none") {
                document.querySelectorAll(".topic-box").forEach((b) => b.classList.remove("active"));
                selectedTopic = "";
            }
        }, 0); // setTimeout to ensure event.target is stable after any UI updates
    });
});