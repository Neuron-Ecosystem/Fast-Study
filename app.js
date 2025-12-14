// Fast Lessons - Рабочая версия с мгновенным обновлением
class FastLessonsApp {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.initializeApp();
    }

    // Инициализация приложения
    initializeApp() {
        this.loadTasks();
        this.setupEventListeners();
        this.renderTasks();
        this.updateStats();
        this.setupServiceWorker();
    }

    // Загрузка задач из localStorage
    loadTasks() {
        try {
            const tasksJson = localStorage.getItem('fastLessonsTasks');
            if (tasksJson) {
                const parsed = JSON.parse(tasksJson);
                this.tasks = parsed.map(task => ({
                    ...task,
                    date: new Date(task.date)
                }));
            }
        } catch (e) {
            console.error('Ошибка загрузки задач:', e);
            this.tasks = [];
        }
    }

    // Сохранение задач
    saveTasks() {
        localStorage.setItem('fastLessonsTasks', JSON.stringify(this.tasks));
        this.updateStats();
        this.renderTasks(); // Сразу перерисовываем
    }

    // Добавление задачи (работает мгновенно)
    addTask(subject, text, dateOption) {
        if (!subject.trim() || !text.trim()) {
            this.showMessage('Введите предмет и задание', 'warning');
            return false;
        }

        const date = new Date();
        if (dateOption === 'tomorrow') {
            date.setDate(date.getDate() + 1);
        }
        date.setHours(23, 59, 0, 0);

        const newTask = {
            id: Date.now(),
            subject: subject.trim(),
            text: text.trim(),
            date: date,
            done: false,
            createdAt: new Date()
        };

        this.tasks.unshift(newTask); // Добавляем в начало
        this.saveTasks();
        
        // Очистка формы
        document.getElementById('subject').value = '';
        document.getElementById('task-text').value = '';
        document.getElementById('subject').focus();
        
        this.showMessage('Задание добавлено!', 'success');
        return true;
    }

    // Переключение статуса задачи (работает мгновенно)
    toggleTaskDone(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            this.tasks[taskIndex].done = !this.tasks[taskIndex].done;
            
            // Анимация
            const taskElement = document.querySelector(`.task[data-id="${taskId}"]`);
            if (taskElement) {
                taskElement.classList.add('task-updating');
                setTimeout(() => taskElement.classList.remove('task-updating'), 500);
            }
            
            this.saveTasks();
        }
    }

    // Удаление задачи (работает мгновенно)
    deleteTask(taskId) {
        if (confirm('Удалить это задание?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.showMessage('Задание удалено', 'info');
        }
    }

    // Фильтрация задач
    filterTasks(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.renderTasks();
    }

    // Получение отфильтрованных задач
    getFilteredTasks() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        
        switch(this.currentFilter) {
            case 'today':
                return this.tasks.filter(task => {
                    const taskDate = new Date(task.date);
                    return taskDate >= todayStart && taskDate < tomorrowStart;
                });
            case 'tomorrow':
                const dayAfterTomorrow = new Date(tomorrowStart);
                dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
                return this.tasks.filter(task => {
                    const taskDate = new Date(task.date);
                    return taskDate >= tomorrowStart && taskDate < dayAfterTomorrow;
                });
            case 'active':
                return this.tasks.filter(task => !task.done);
            default:
                return this.tasks;
        }
    }

    // Форматирование даты
    formatDate(date) {
        const taskDate = new Date(date);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (taskDate >= today && taskDate < tomorrow) {
            return { text: 'Сегодня', icon: '☀️', isToday: true };
        } else if (taskDate >= tomorrow && taskDate < new Date(tomorrow.getTime() + 24*60*60*1000)) {
            return { text: 'Завтра', icon: '🌙', isTomorrow: true };
        } else {
            return { 
                text: taskDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), 
                icon: '📅',
                isToday: false,
                isTomorrow: false
            };
        }
    }

    // Обновление статистики
    updateStats() {
        const totalTasks = this.tasks.length;
        const todayTasks = this.tasks.filter(task => {
            const taskDate = new Date(task.date);
            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const tomorrowStart = new Date(todayStart);
            tomorrowStart.setDate(tomorrowStart.getDate() + 1);
            return taskDate >= todayStart && taskDate < tomorrowStart && !task.done;
        }).length;
        
        document.getElementById('task-count').textContent = `${totalTasks} заданий`;
        document.getElementById('today-count').textContent = `${todayTasks} на сегодня`;
    }

    // Отрисовка задач (мгновенная)
    renderTasks() {
        const container = document.getElementById('tasks-list');
        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            container.innerHTML = '';
            document.getElementById('empty-state').style.display = 'block';
            return;
        }
        
        document.getElementById('empty-state').style.display = 'none';
        
        // Сортируем: сначала активные, потом выполненные
        const sortedTasks = [...filteredTasks].sort((a, b) => {
            if (a.done !== b.done) return a.done ? 1 : -1;
            return new Date(b.createdAt) - new Date(a.createdAt); // Новые сверху
        });
        
        let tasksHTML = '';
        
        sortedTasks.forEach(task => {
            const dateInfo = this.formatDate(task.date);
            const dateClass = dateInfo.isToday ? 'today' : dateInfo.isTomorrow ? 'tomorrow' : '';
            
            tasksHTML += `
                <div class="task ${task.done ? 'done' : ''} ${dateClass}" data-id="${task.id}">
                    <div class="task-checkbox">
                        <input type="checkbox" id="task-${task.id}" ${task.done ? 'checked' : ''}>
                        <label for="task-${task.id}" class="checkmark"></label>
                    </div>
                    <div class="task-content">
                        <div class="task-header">
                            <div class="task-subject">${this.escapeHtml(task.subject)}</div>
                        </div>
                        <div class="task-text">${this.escapeHtml(task.text)}</div>
                        <div class="task-footer">
                            <div class="task-date">
                                ${dateInfo.icon} ${dateInfo.text}
                            </div>
                            <div class="task-actions">
                                <button class="action-btn delete-btn" title="Удалить задание">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = tasksHTML;
        
        // Добавляем обработчики событий для новых элементов
        this.attachTaskEventListeners();
    }

    // Экранирование HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Привязка обработчиков событий к задачам
    attachTaskEventListeners() {
        // Обработчики для чекбоксов
        document.querySelectorAll('.task-checkbox input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const taskId = parseInt(e.target.closest('.task').dataset.id);
                this.toggleTaskDone(taskId);
            });
        });

        // Обработчики для кнопок удаления
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = parseInt(e.target.closest('.task').dataset.id);
                this.deleteTask(taskId);
            });
        });

        // Клик по задаче (отмечаем выполненным)
        document.querySelectorAll('.task').forEach(task => {
            task.addEventListener('click', (e) => {
                // Если клик не по чекбоксу или кнопке удаления
                if (!e.target.closest('.task-checkbox') && !e.target.closest('.delete-btn')) {
                    const taskId = parseInt(task.dataset.id);
                    const checkbox = task.querySelector('.task-checkbox input');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event('change'));
                    }
                }
            });
        });
    }

    // Показать сообщение
    showMessage(text, type) {
        const message = document.createElement('div');
        message.className = `message message-${type}`;
        message.textContent = text;
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : 
                        type === 'warning' ? '#FF9800' : '#2196F3'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 3000);
        
        // Добавляем CSS для анимации
        if (!document.querySelector('#message-styles')) {
            const style = document.createElement('style');
            style.id = 'message-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Кнопка добавления
        document.getElementById('add-btn').addEventListener('click', () => {
            const subject = document.getElementById('subject').value;
            const text = document.getElementById('task-text').value;
            const dateOption = document.querySelector('.date-btn.active').dataset.date;
            this.addTask(subject, text, dateOption);
        });

        // Выбор даты
        document.querySelectorAll('.date-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Фильтры
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterTasks(btn.dataset.filter);
            });
        });

        // Добавление по Enter
        document.getElementById('subject').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('task-text').focus();
            }
        });

        document.getElementById('task-text').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                const subject = document.getElementById('subject').value;
                const text = document.getElementById('task-text').value;
                const dateOption = document.querySelector('.date-btn.active').dataset.date;
                this.addTask(subject, text, dateOption);
            }
        });
    }

    // Настройка Service Worker
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js')
                .then(() => console.log('Service Worker зарегистрирован'))
                .catch(err => console.log('Ошибка:', err));
        }
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FastLessonsApp();
});
