export class EducationalFeatures {
    constructor(options = {}) {
        this.currentTutorialStep = 0;
        this.tutorialData = null;
        this.quizData = null;
        this.currentQuizQuestion = 0;
        this.quizScore = 0;
        this.hintTimeout = null;
        
        // Optional callbacks
        this.switchInputMode = options.switchInputMode || (() => {});
        this.showNotification = options.showNotification || ((msg, type) => alert(msg));

        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.bindEvents();
                this.loadQuizData();
            });
        } else {
            this.bindEvents();
            this.loadQuizData();
        }
    }

    bindEvents() {
        // Mode switching
        document.getElementById('modeLearn').addEventListener('click', () => {
            this.switchToLearnMode();
        });

        // Learning mode buttons
        document.getElementById('learnTutorial').addEventListener('click', () => {
            this.showTutorialControls();
        });

        document.getElementById('learnPractice').addEventListener('click', () => {
            this.showPracticeControls();
        });

        document.getElementById('learnQuiz').addEventListener('click', () => {
            this.showQuizControls();
        });

        // Tutorial controls
        document.getElementById('startTutorial').addEventListener('click', () => {
            this.startTutorial();
        });

        document.getElementById('prevStep').addEventListener('click', () => {
            this.previousTutorialStep();
        });

        document.getElementById('nextStep').addEventListener('click', () => {
            this.nextTutorialStep();
        });

        // Practice controls
        document.getElementById('generatePractice').addEventListener('click', () => {
            this.generatePracticeProblem();
        });

        // Quiz controls
        document.getElementById('startQuiz').addEventListener('click', () => {
            this.startQuiz();
        });

        document.getElementById('retakeQuiz').addEventListener('click', () => {
            this.startQuiz();
        });

        // Modal controls
        document.getElementById('closeTutorial').addEventListener('click', () => {
            this.closeTutorial();
        });

        document.getElementById('closeQuiz').addEventListener('click', () => {
            this.closeQuiz();
        });

        // Quiz answer buttons
        document.querySelectorAll('.quiz-answer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectQuizAnswer(e.target.dataset.answer);
            });
        });

        // Hint system
        document.getElementById('closeHint').addEventListener('click', () => {
            this.hideHint();
        });
    }

    switchToLearnMode() {
        // Update UI mode
        document.querySelectorAll('.btn-mode').forEach(btn => btn.classList.remove('active'));
        document.getElementById('modeLearn').classList.add('active');

        // Show learning inputs
        this.showInputSection('learnInput');

        // Hide solve button initially
        document.getElementById('solveBtn').style.display = 'none';
    }

    showInputSection(sectionId) {
        const sections = ['mintermInputs', 'expressionInput', 'interactiveInput', 'learnInput'];
        sections.forEach(id => {
            document.getElementById(id).style.display = id === sectionId ? 'block' : 'none';
        });
    }

    showTutorialControls() {
        document.querySelectorAll('.btn-outline').forEach(btn => btn.classList.remove('active'));
        document.getElementById('learnTutorial').classList.add('active');

        document.getElementById('tutorialControls').style.display = 'block';
        document.getElementById('practiceControls').style.display = 'none';
        document.getElementById('quizControls').style.display = 'none';
    }

    showPracticeControls() {
        document.querySelectorAll('.btn-outline').forEach(btn => btn.classList.remove('active'));
        document.getElementById('learnPractice').classList.add('active');

        document.getElementById('tutorialControls').style.display = 'none';
        document.getElementById('practiceControls').style.display = 'block';
        document.getElementById('quizControls').style.display = 'none';
    }

    showQuizControls() {
        document.querySelectorAll('.btn-outline').forEach(btn => btn.classList.remove('active'));
        document.getElementById('learnQuiz').classList.add('active');

        document.getElementById('tutorialControls').style.display = 'none';
        document.getElementById('practiceControls').style.display = 'none';
        document.getElementById('quizControls').style.display = 'block';
    }

    startTutorial() {
        const problemType = document.getElementById('tutorialProblem').value;
        this.tutorialData = this.generateTutorialData(problemType);
        this.currentTutorialStep = 0;
        this.showTutorialModal();
        this.updateTutorialStep();
    }

    generateTutorialData(problemType) {
        const tutorials = {
            simple: {
                problem: { vars: 2, minterms: [0, 1], dontCares: [] },
                steps: [
                    {
                        title: "Step 1: Understanding the Problem",
                        description: "We have a 2-variable K-Map with minterms m(0,1). This means we need to cover cells 0 and 1 in the K-Map.",
                        visualization: "kmap-2var-empty"
                    },
                    {
                        title: "Step 2: Plotting the Minterms",
                        description: "Let's plot the minterms on the K-Map. Cell 0 (A'B') and cell 1 (A'B) are marked with 1s.",
                        visualization: "kmap-2var-plotted"
                    },
                    {
                        title: "Step 3: Finding Groups",
                        description: "We need to find the largest rectangular groups of 1s. Here we can group cells 0 and 1 together in a horizontal group.",
                        visualization: "kmap-2var-group"
                    },
                    {
                        title: "Step 4: Determining the Expression",
                        description: "The horizontal group covers cells where A' is constant and B changes. This gives us the expression A'.",
                        visualization: "kmap-2var-final"
                    }
                ]
            },
            medium: {
                problem: { vars: 3, minterms: [0, 1, 2, 3], dontCares: [] },
                steps: [
                    {
                        title: "Step 1: Understanding the 3-Variable Problem",
                        description: "We have minterms m(0,1,2,3). Let's plot these on a 3-variable K-Map.",
                        visualization: "kmap-3var-empty"
                    },
                    {
                        title: "Step 2: Plotting Minterms",
                        description: "Plotting the minterms: 0(A'B'C'), 1(A'B'C), 2(A'BC'), and 3(A'BC).",
                        visualization: "kmap-3var-plotted"
                    },
                    {
                        title: "Step 3: Finding Optimal Groups",
                        description: "We can group all four cells in the first row together, which gives us the simplest solution.",
                        visualization: "kmap-3var-group"
                    },
                    {
                        title: "Step 4: The Minimized Expression",
                        description: "The 4-cell horizontal group covers cells where A'B' is constant and C changes. This gives us A'B' as our minimized expression!",
                        visualization: "kmap-3var-final"
                    }
                ]
            },
            complex: {
                problem: { vars: 4, minterms: [0, 1, 2, 3, 8, 9, 10, 11], dontCares: [] },
                steps: [
                    {
                        title: "Step 1: Understanding the 4-Variable Problem",
                        description: "We have minterms m(0,1,2,3,8,9,10,11). This covers two 4-cell groups in the K-Map.",
                        visualization: "kmap-4var-empty"
                    },
                    {
                        title: "Step 2: Plotting the Minterms",
                        description: "Plotting all 8 minterms: cells 0-3 in the top-left quadrant and cells 8-11 in the bottom-left quadrant.",
                        visualization: "kmap-4var-plotted"
                    },
                    {
                        title: "Step 3: Finding Optimal Groups",
                        description: "We can form two 4-cell groups: one covering cells 0,1,2,3 and another covering cells 8,9,10,11.",
                        visualization: "kmap-4var-group"
                    },
                    {
                        title: "Step 4: The Minimized Expression",
                        description: "Each 4-cell group covers where A'B' is constant and C,D change. So we get A'B' + A'B' = A'B' as our final expression!",
                        visualization: "kmap-4var-final"
                    }
                ]
            }
        };

        return tutorials[problemType];
    }

    showTutorialModal() {
        document.getElementById('tutorialModal').style.display = 'flex';
    }

    closeTutorial() {
        document.getElementById('tutorialModal').style.display = 'none';
        this.currentTutorialStep = 0;
    }

    updateTutorialStep() {
        const step = this.tutorialData.steps[this.currentTutorialStep];
        const totalSteps = this.tutorialData.steps.length;

        document.getElementById('stepTitle').textContent = step.title;
        document.getElementById('stepDescription').textContent = step.description;
        document.getElementById('currentStep').textContent = this.currentTutorialStep + 1;
        document.getElementById('totalSteps').textContent = totalSteps;

        // Update navigation buttons
        document.getElementById('prevStep').disabled = this.currentTutorialStep === 0;
        document.getElementById('nextStep').textContent =
            this.currentTutorialStep === totalSteps - 1 ? 'Finish' : 'Next';

        // Update visualization
        this.updateTutorialVisualization(step.visualization);
    }

    updateTutorialVisualization(visualizationType) {
        const container = document.getElementById('stepVisualization');
        container.innerHTML = '';

        // Get the problem data for this tutorial
        const problem = this.tutorialData.problem;

        // Create the K-Map using the same structure as the main application
        const kmapContainer = document.createElement('div');
        kmapContainer.className = 'kmap-container';

        const kmapWrapper = document.createElement('div');
        kmapWrapper.className = 'kmap-wrapper';
        kmapContainer.appendChild(kmapWrapper);

        const table = this.createKMapTableForTutorial(problem.vars, problem.minterms, problem.dontCares, visualizationType);
        kmapWrapper.appendChild(table);

        // Remove scaling to prevent size issues
        // kmapContainer.style.transform = 'scale(0.8)';
        // kmapContainer.style.transformOrigin = 'top left';
        // kmapContainer.style.marginBottom = '1rem';

        container.appendChild(kmapContainer);
    }

    createKMapTableForTutorial(numVars, minterms, dontCares, stage) {
        // Parse the stage from the visualization type
        const stageType = stage.split('-').pop(); // 'empty', 'plotted', 'group', 'final'
        
        // Use the same table creation logic as the main application
        const table = document.createElement('table');
        table.className = 'kmap-table';

        if (numVars === 2) {
            return this.createKMap2VarTutorial(table, minterms, dontCares, stageType);
        } else if (numVars === 3) {
            return this.createKMap3VarTutorial(table, minterms, dontCares, stageType);
        } else if (numVars === 4) {
            return this.createKMap4VarTutorial(table, minterms, dontCares, stageType);
        }

        return table;
    }

    createKMap2VarTutorial(table, minterms, dontCares, stageType) {
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th></th>
            <th><span class="overline">B</span><sub>0</sub></th>
            <th>B<sub>1</sub></th>
        `;
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        for (let a = 0; a < 2; a++) {
            const row = document.createElement('tr');
            const header = document.createElement('th');
            if (a === 0) {
                header.innerHTML = '<span class="overline">A</span><sub>0</sub>';
            } else {
                header.innerHTML = 'A<sub>1</sub>';
            }
            row.appendChild(header);

            for (let b = 0; b < 2; b++) {
                const minterm = a * 2 + b;
                const cell = this.createTutorialCell(minterm, minterms, dontCares, stageType, a, b, [0, 1]);
                row.appendChild(cell);
            }

            tbody.appendChild(row);
        }

        table.appendChild(tbody);
        return table;
    }

    createTutorialCell(minterm, minterms, dontCares, stageType, row, col, groupedMinterms = []) {
        const cell = document.createElement('td');

        const isMinterm = minterms.includes(minterm);
        const isDontCare = dontCares.includes(minterm);

        // Set content based on stage
        if (stageType === 'empty') {
            // Empty cells for initial step
            cell.textContent = '';
            cell.className = 'cell-zero'; // Default styling
        } else {
            // Show content for plotted, group, final stages
            if (isDontCare) {
                cell.textContent = 'X';
                cell.className = 'cell-dontcare';
            } else if (isMinterm) {
                cell.textContent = '1';
                cell.className = 'cell-one';
            } else {
                cell.textContent = '0';
                cell.className = 'cell-zero';
            }
        }

        // Add grouping highlights for tutorial
        if (stageType === 'group' && groupedMinterms.includes(minterm)) {
            cell.classList.add('grouped-tutorial');
        }
        if (stageType === 'final' && groupedMinterms.includes(minterm)) {
            cell.classList.add('highlighted-tutorial');
        }

        cell.dataset.minterm = minterm;
        cell.dataset.row = row;
        cell.dataset.col = col;

        return cell;
    }
    createKMap3VarTutorial(table, minterms, dontCares, stageType) {
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        headerRow.innerHTML = `
            <th></th>
            <th><span class="overline">B</span><span class="overline">C</span><sub>00</sub></th>
            <th><span class="overline">B</span>C<sub>01</sub></th>
            <th>BC<sub>11</sub></th>
            <th>B<span class="overline">C</span><sub>10</sub></th>
        `;

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        for (let a = 0; a < 2; a++) {
            const row = document.createElement('tr');
            const header = document.createElement('th');
            if (a === 0) {
                header.innerHTML = '<span class="overline">A</span><sub>0</sub>';
            } else {
                header.innerHTML = 'A<sub>1</sub>';
            }
            row.appendChild(header);

            for (let bcIdx = 0; bcIdx < 4; bcIdx++) {
                const bc = [0, 1, 3, 2][bcIdx]; // Gray code order
                const minterm = a * 4 + bc;
                const cell = this.createTutorialCell(minterm, minterms, dontCares, stageType, a, bcIdx, [0, 1, 2, 3]);
                row.appendChild(cell);
            }
            tbody.appendChild(row);
        }

        table.appendChild(tbody);
        return table;
    }

    createKMap4VarTutorial(table, minterms, dontCares, stageType) {
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        headerRow.innerHTML = `
            <th></th>
            <th><span class="overline">C</span><span class="overline">D</span><sub>00</sub></th>
            <th><span class="overline">C</span>D<sub>01</sub></th>
            <th>CD<sub>11</sub></th>
            <th>C<span class="overline">D</span><sub>10</sub></th>
        `;

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        for (let abIdx = 0; abIdx < 4; abIdx++) {
            const ab = [0, 1, 3, 2][abIdx]; // Gray code order
            const row = document.createElement('tr');
            const header = document.createElement('th');
            const abBinary = ab.toString(2).padStart(2, '0');
            let label = '';

            if (abBinary === '00') {
                label = '<span class="overline">A</span><span class="overline">B</span><sub>00</sub>';
            } else if (abBinary === '01') {
                label = '<span class="overline">A</span>B<sub>01</sub>';
            } else if (abBinary === '11') {
                label = 'AB<sub>11</sub>';
            } else if (abBinary === '10') {
                label = 'A<span class="overline">B</span><sub>10</sub>';
            }

            header.innerHTML = label;
            row.appendChild(header);

            for (let cdIdx = 0; cdIdx < 4; cdIdx++) {
                const cd = [0, 1, 3, 2][cdIdx]; // Gray code order
                const minterm = (ab << 2) | cd;
                const cell = this.createTutorialCell(minterm, minterms, dontCares, stageType, abIdx, cdIdx, [0, 1, 2, 3, 8, 9, 10, 11]);
                row.appendChild(cell);
            }
            tbody.appendChild(row);
        }

        table.appendChild(tbody);
        return table;
    }

    previousTutorialStep() {
        if (this.currentTutorialStep > 0) {
            this.currentTutorialStep--;
            this.updateTutorialStep();
        }
    }

    nextTutorialStep() {
        const totalSteps = this.tutorialData.steps.length;
        if (this.currentTutorialStep < totalSteps - 1) {
            this.currentTutorialStep++;
            this.updateTutorialStep();
        } else {
            this.closeTutorial();
            this.showNotification('Tutorial completed! Try a practice problem.', 'success');
        }
    }

    generatePracticeProblem() {
        const difficulty = document.getElementById('practiceDifficulty').value;

        // Generate a random problem based on difficulty
        const problem = this.generateRandomKMapProblem(difficulty);

        // Set up the problem in the main interface
        document.getElementById('variables').value = problem.vars;
        document.getElementById('minterms').value = problem.minterms.join(', ');
        document.getElementById('dontcares').value = problem.dontCares.join(', ');

        // Switch to minterm mode and solve
        this.switchInputMode('minterm');
        document.getElementById('solveBtn').style.display = 'block';
        document.getElementById('solveBtn').click();

        // Show hint after a delay
        this.showHint(`Practice Problem (${difficulty}): Try to find the minimized expression.`);
    }

    generateRandomKMapProblem(difficulty) {
        const maxMinterms = { easy: 4, medium: 8, hard: 16 };
        const numVars = { easy: 2, medium: 3, hard: 4 };
        const vars = numVars[difficulty];
        const totalCells = Math.pow(2, vars);

        // Generate random number of minterms (2-4 for easy, 3-6 for medium, 4-8 for hard)
        const minMinterms = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
        const maxMintermsCount = maxMinterms[difficulty];
        const numMinterms = minMinterms + Math.floor(Math.random() * (maxMintermsCount - minMinterms + 1));

        // Generate unique random minterms
        const minterms = [];
        const available = Array.from({length: totalCells}, (_, i) => i);

        for (let i = 0; i < numMinterms; i++) {
            const randomIndex = Math.floor(Math.random() * available.length);
            minterms.push(available.splice(randomIndex, 1)[0]);
        }

        minterms.sort((a, b) => a - b);

        // Sometimes add don't cares (20% chance)
        const dontCares = [];
        if (Math.random() < 0.2) {
            const remainingCells = available.filter(cell => !minterms.includes(cell));
            const numDontCares = Math.min(remainingCells.length, Math.floor(Math.random() * 3) + 1);
            for (let i = 0; i < numDontCares; i++) {
                const randomIndex = Math.floor(Math.random() * remainingCells.length);
                dontCares.push(remainingCells.splice(randomIndex, 1)[0]);
            }
            dontCares.sort((a, b) => a - b);
        }

        return { vars, minterms, dontCares };
    }

    loadQuizData() {
        // Generate random quiz questions instead of hardcoded ones
        this.quizData = this.generateRandomQuizData();
    }

    generateRandomQuizData() {
        const quizData = {
            beginner: [],
            intermediate: [],
            advanced: []
        };

        // Generate beginner questions
        for (let i = 0; i < 5; i++) {
            quizData.beginner.push(this.generateBeginnerQuestion());
        }

        // Generate intermediate questions
        for (let i = 0; i < 5; i++) {
            quizData.intermediate.push(this.generateIntermediateQuestion());
        }

        // Generate advanced questions
        for (let i = 0; i < 5; i++) {
            quizData.advanced.push(this.generateAdvancedQuestion());
        }

        return quizData;
    }

    generateBeginnerQuestion() {
        const questionTypes = [
            () => {
                const vars = 2 + Math.floor(Math.random() * 3); // 2-4 variables
                const maxCells = Math.pow(2, vars);
                return {
                    question: `What is the maximum number of cells in a ${vars}-variable K-Map?`,
                    answers: [
                        (maxCells / 4).toString(),
                        maxCells.toString(),
                        (maxCells * 2).toString(),
                        (maxCells * 4).toString()
                    ],
                    correct: "B",
                    explanation: `A ${vars}-variable K-Map has 2^${vars} = ${maxCells} cells.`
                };
            },
            () => {
                const groups = ["2 cells in a diagonal", "4 cells in a square", "8 cells in a rectangle", "All of the above"];
                return {
                    question: "Which of these represents a valid K-Map group?",
                    answers: groups,
                    correct: "D",
                    explanation: "Groups can be any rectangular power-of-2 number of cells."
                };
            },
            () => {
                return {
                    question: "What does a 'don't care' (X) in a K-Map represent?",
                    answers: ["Invalid input", "Input never occurs", "Can be either 0 or 1", "Logic error"],
                    correct: "C",
                    explanation: "Don't cares can be treated as either 0 or 1 to help minimization."
                };
            }
        ];

        return questionTypes[Math.floor(Math.random() * questionTypes.length)]();
    }

    generateIntermediateQuestion() {
        const questionTypes = [
            () => {
                const grayCodes = ["00 → 01 → 11 → 10", "00 → 01 → 10 → 11", "00 → 10 → 01 → 11", "00 → 11 → 01 → 10"];
                return {
                    question: "In Gray code ordering for 2 variables, what is the correct sequence?",
                    answers: grayCodes,
                    correct: "A",
                    explanation: "Gray code: 00 → 01 → 11 → 10 (only one bit changes at a time)."
                };
            },
            () => {
                const vars = 2 + Math.floor(Math.random() * 3); // 2-4 variables
                const maxGroup = Math.pow(2, vars);
                return {
                    question: `What is the size of the largest possible group in a ${vars}-variable K-Map?`,
                    answers: [
                        (maxGroup / 4).toString() + " cells",
                        (maxGroup / 2).toString() + " cells",
                        maxGroup.toString() + " cells",
                        (maxGroup * 2).toString() + " cells"
                    ],
                    correct: "C",
                    explanation: `Maximum group size is ${maxGroup} cells (2^${vars}) in a ${vars}-variable K-Map.`
                };
            },
            () => {
                const expressions = ["A'B'", "CD'", "A'D'", "BC'"];
                const randomExpr = expressions[Math.floor(Math.random() * expressions.length)];
                return {
                    question: `Which variable combination represents the group covering cells where ${randomExpr} is constant?`,
                    answers: expressions,
                    correct: String.fromCharCode(65 + expressions.indexOf(randomExpr)), // A, B, C, D
                    explanation: `The expression ${randomExpr} represents the common terms in that group.`
                };
            }
        ];

        return questionTypes[Math.floor(Math.random() * questionTypes.length)]();
    }

    generateAdvancedQuestion() {
        const questionTypes = [
            () => {
                const allMinterms = Math.floor(Math.random() * 4) + 2; // 2-5 variables
                const totalCells = Math.pow(2, allMinterms);
                return {
                    question: `What is the minimum number of prime implicants needed to cover all minterms in f = Σm(${Array.from({length: totalCells}, (_, i) => i).join(',')})?`,
                    answers: ["1", "2", "3", "4"],
                    correct: "A",
                    explanation: `All ${totalCells} cells can be covered by one ${totalCells}-cell group, giving expression '1'.`
                };
            },
            () => {
                return {
                    question: "In the Quine-McCluskey method, what does 'essential prime implicant' mean?",
                    answers: ["Largest group", "Covers most minterms", "Only implicant covering certain minterm", "Simplest expression"],
                    correct: "C",
                    explanation: "An essential prime implicant is the only one that covers a particular minterm."
                };
            },
            () => {
                return {
                    question: "What is the complexity order of the Quine-McCluskey algorithm?",
                    answers: ["O(n)", "O(n²)", "O(2^n)", "O(n!)"],
                    correct: "C",
                    explanation: "Quine-McCluskey has exponential time complexity O(2^n) in the worst case."
                };
            }
        ];

        return questionTypes[Math.floor(Math.random() * questionTypes.length)]();
    }

    startQuiz() {
        const difficulty = document.getElementById('quizDifficulty').value;
        this.currentQuizQuestion = 0;
        this.quizScore = 0;
        this.showQuizModal();
        this.showQuizQuestion();
    }

    showQuizModal() {
        document.getElementById('quizModal').style.display = 'flex';
        document.getElementById('quizContent').style.display = 'block';
        document.getElementById('quizResults').style.display = 'none';
    }

    closeQuiz() {
        document.getElementById('quizModal').style.display = 'none';
    }

    showQuizQuestion() {
        const difficulty = document.getElementById('quizDifficulty').value;
        const question = this.quizData[difficulty][this.currentQuizQuestion];

        document.getElementById('quizQuestion').textContent =
            `Question ${this.currentQuizQuestion + 1}: ${question.question}`;

        const answerBtns = document.querySelectorAll('.quiz-answer-btn');
        answerBtns.forEach((btn, index) => {
            btn.textContent = `${String.fromCharCode(65 + index)}) ${question.answers[index]}`;
            btn.className = 'quiz-answer-btn';
            btn.disabled = false;
        });

        // Create a mini problem visualization if needed
        this.updateQuizVisualization(question);
    }

    updateQuizVisualization(question) {
        const container = document.getElementById('quizProblem');
        container.innerHTML = '';

        // Add visual aids for certain questions
        if (question.question.includes("Gray code")) {
            container.innerHTML = `
                <div style="font-family: monospace; text-align: center;">
                    <p>Gray Code Sequence:</p>
                    <p>00 → 01 → 11 → 10</p>
                    <p style="margin-top: 1rem;">What comes after 01?</p>
                </div>
            `;
        } else if (question.question.includes("largest possible group")) {
            container.innerHTML = `
                <div style="text-align: center;">
                    <p>4-Variable K-Map has 16 cells</p>
                    <p>Group sizes must be powers of 2: 1, 2, 4, 8, 16</p>
                </div>
            `;
        }
    }

    selectQuizAnswer(answer) {
        const difficulty = document.getElementById('quizDifficulty').value;
        const question = this.quizData[difficulty][this.currentQuizQuestion];
        const isCorrect = answer === question.correct;

        // Update button styles
        const answerBtns = document.querySelectorAll('.quiz-answer-btn');
        answerBtns.forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.answer === question.correct) {
                btn.classList.add('correct');
            } else if (btn.dataset.answer === answer && !isCorrect) {
                btn.classList.add('incorrect');
            }
        });

        if (isCorrect) {
            this.quizScore++;
        }

        // Show explanation and move to next question after delay
        setTimeout(() => {
            this.showQuizExplanation(question.explanation, isCorrect);
        }, 1000);
    }

    showQuizExplanation(explanation, isCorrect) {
        // For now, just show in a simple alert. Could be enhanced with a modal
        alert(`${isCorrect ? 'Correct!' : 'Incorrect.'} ${explanation}`);

        this.currentQuizQuestion++;

        const difficulty = document.getElementById('quizDifficulty').value;
        if (this.currentQuizQuestion < this.quizData[difficulty].length) {
            this.showQuizQuestion();
        } else {
            this.showQuizResults();
        }
    }

    showQuizResults() {
        document.getElementById('quizContent').style.display = 'none';
        document.getElementById('quizResults').style.display = 'block';

        const difficulty = document.getElementById('quizDifficulty').value;
        const totalQuestions = this.quizData[difficulty].length;
        const percentage = Math.round((this.quizScore / totalQuestions) * 100);

        document.getElementById('quizScore').textContent = `${this.quizScore}/${totalQuestions}`;
        document.getElementById('quizTotal').textContent = totalQuestions;

        let feedback = '';
        if (percentage >= 80) {
            feedback = 'Excellent! You have a strong understanding of K-Maps.';
        } else if (percentage >= 60) {
            feedback = 'Good job! Review the concepts you missed and try again.';
        } else {
            feedback = 'Keep studying! Consider going through the tutorial again.';
        }

        document.getElementById('quizFeedback').textContent = feedback;
    }

    showHint(message) {
        const hintPanel = document.getElementById('hintPanel');
        document.getElementById('hintContent').textContent = message;
        hintPanel.style.display = 'block';

        // Auto-hide after 10 seconds
        if (this.hintTimeout) clearTimeout(this.hintTimeout);
        this.hintTimeout = setTimeout(() => {
            this.hideHint();
        }, 10000);
    }

    hideHint() {
        document.getElementById('hintPanel').style.display = 'none';
        if (this.hintTimeout) {
            clearTimeout(this.hintTimeout);
            this.hintTimeout = null;
        }
    }
}