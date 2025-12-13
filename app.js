// app.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('task-form');
    const list = document.getElementById('task-list');
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    const renderTasks = () => {
        list.innerHTML = '';
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>\( {task.subject} - \){task.text} (${task.date})</span>
                <input type="checkbox" ${task.done ? 'checked' : ''}>
            `;
            if (task.done) li.classList.add('done');
            li.querySelector('input').addEventListener('change', (e) => {
                tasks[index].done = e.target.checked;
                saveTasks();
                renderTasks();
            });
            list.appendChild(li);
        });
    };

    const saveTasks = () => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const subject = document.getElementById('subject').value;
        const text = document.getElementById('text').value;
        const date = document.getElementById('date').value;
        tasks.push({ subject, text, date, done: false });
        saveTasks();
        renderTasks();
        form.reset();
    });

    renderTasks();
});
