const Question = require('../models/question');

//Creation of a new question
exports.createQuestion = async (req, res) => {
    try {
        const question = await Question.create(req.body);
        res.status(201).json(question);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Reading all the questions
exports.getAllQuestions = async (req, res) => {
    try {
        const questions = await Question.find();
        res.status(200).json(questions);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//Reading a single question by ID
exports.getQuestionById = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        res.status(200).json(question);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//Updating a question by ID
exports.updateQuestion = async (req, res) => {
    try {
        const question_update = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!question_update) {
            return res.status(404).json({ error: 'Question not found' });
        }
        res.status(200).json(question_update);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


//Deleting a question by ID
exports.deleteQuestion = async (req, res) => {
    try {
        const question_delete = await Question.findByIdAndDelete(req.params.id);
        if (!question_delete) {
            return res.status(404).json({ error: 'Question not found' });
        }
        res.status(200).json({ message: 'Question deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

