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
                    date: new Date(task.date),
                    // Преобразуем id в число, если это строка
                    id: typeof task.id === 'string' ? parseInt(task.id) : task.id
                }));
            }
        } catch (e) {
            console.error('Ошибка загрузки задач:', e);
            this.tasks = [];
        }
    }

    // Сохранение задач
    saveTasks() {
        try {
            localStorage.setItem('fastLessonsTasks', JSON.stringify(this.tasks));
        } catch (e) {
            console.error('Ошибка сохранения задач:', e);
        }
        this.updateStats();
        this.renderTasks();
    }

    // Добавление задачи
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
            id: Date.now() + Math.floor(Math.random() * 1000), // Уникальный ID
            subject: subject.trim(),
            text: text.trim(),
            date: date,
            done: false
        };

        this.tasks.unshift(newTask);
        this.saveTasks();
        
        // Очистка формы
        document.getElementById('subject').value = '';
        document.getElementById('task-text').value = '';
        document.getElementById('subject').focus();
        
        this.showMessage('Задание добавлено!', 'success');
        return true;
    }

    // Переключение статуса задачи
    toggleTaskDone(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            this.tasks[taskIndex].done = !this.tasks[taskIndex].done;
            this.saveTasks();
        }
    }

    // Удаление задачи
    deleteTask(taskId) {
        // Используем более простое подтверждение
        if (window.confirm('Удалить это задание?')) {
            const initialLength = this.tasks.length;
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            
            if (this.tasks.length < initialLength) {
                this.saveTasks();
                this.showMessage('Задание удалено', 'info');
            }
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
                return [...this.tasks];
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
            return { text: 'Сегодня', isToday: true };
        } else if (taskDate >= tomorrow && taskDate < new Date(tomorrow.getTime() + 24*60*60*1000)) {
            return { text: 'Завтра', isTomorrow: true };
        } else {
            return { 
                text: taskDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), 
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

    // Отрисовка задач
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
            return new Date(b.date) - new Date(a.date);
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
                                ${dateInfo.text}
                            </div>
                            <div class="task-actions">
                                <button class="action-btn delete-btn" data-id="${task.id}" title="Удалить задание">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = tasksHTML;
        
        // Сразу привязываем обработчики после рендеринга
        this.bindTaskEvents();
    }

    // Экранирование HTML
    escapeHtml(text) {
        return text.replace(/[&<>"']/g, function(m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[m];
        });
    }

    // Привязка обработчиков событий к задачам (ИСПРАВЛЕНО!)
    bindTaskEvents() {
        // Обработчики для чекбоксов
        document.querySelectorAll('.task-checkbox input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const taskId = parseInt(e.target.closest('.task').dataset.id);
                this.toggleTaskDone(taskId);
            });
        });

        // Обработчики для кнопок удаления (ВОТ ИСПРАВЛЕНИЕ!)
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const taskId = parseInt(btn.dataset.id); // Берем data-id из кнопки
                if (taskId) {
                    this.deleteTask(taskId);
                }
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
        // Создаем простое уведомление
        alert(text); // Используем простой alert для надежности
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Кнопка добавления
        const addBtn = document.getElementById('add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const subject = document.getElementById('subject').value;
                const text = document.getElementById('task-text').value;
                const activeDateBtn = document.querySelector('.date-btn.active');
                const dateOption = activeDateBtn ? activeDateBtn.dataset.date : 'today';
                this.addTask(subject, text, dateOption);
            });
        }

        // Выбор даты
        document.querySelectorAll('.date-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Фильтры
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterTasks(e.target.dataset.filter);
            });
        });

        // Добавление по Enter
        document.getElementById('subject').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('task-text').focus();
            }
        });

        document.getElementById('task-text').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                const subject = document.getElementById('subject').value;
                const text = document.getElementById('task-text').value;
                const activeDateBtn = document.querySelector('.date-btn.active');
                const dateOption = activeDateBtn ? activeDateBtn.dataset.date : 'today';
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
