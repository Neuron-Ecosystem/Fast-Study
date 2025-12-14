// Fast Lessons - Основное приложение
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
        this.registerServiceWorker();
        this.setupPWAInstallPrompt();
    }

    // Загрузка задач из localStorage
    loadTasks() {
        const tasksJson = localStorage.getItem('fastLessonsTasks');
        if (tasksJson) {
            this.tasks = JSON.parse(tasksJson);
            
            // Конвертируем строки дат в объекты Date
            this.tasks.forEach(task => {
                task.date = new Date(task.date);
            });
        }
    }

    // Сохранение задач в localStorage
    saveTasks() {
        localStorage.setItem('fastLessonsTasks', JSON.stringify(this.tasks));
    }

    // Добавление новой задачи
    addTask(subject, text, dateOption) {
        if (!subject.trim() || !text.trim()) {
            alert('Пожалуйста, заполните предмет и текст задания');
            return;
        }

        const date = new Date();
        
        // Устанавливаем дату в зависимости от выбора
        if (dateOption === 'tomorrow') {
            date.setDate(date.getDate() + 1);
        }
        
        // Устанавливаем время на конец дня (23:59)
        date.setHours(23, 59, 0, 0);

        const newTask = {
            id: Date.now(),
            subject: subject.trim(),
            text: text.trim(),
            date: date,
            done: false
        };

        this.tasks.push(newTask);
        this.saveTasks();
        this.renderTasks();
        
        // Очищаем форму
        document.getElementById('subject').value = '';
        document.getElementById('task-text').value = '';
        
        // Фокус на поле предмета
        document.getElementById('subject').focus();
    }

    // Отметка задачи как выполненной/невыполненной
    toggleTaskDone(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.done = !task.done;
            this.saveTasks();
            this.renderTasks();
        }
    }

    // Удаление задачи
    deleteTask(taskId) {
        if (confirm('Удалить это задание?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.renderTasks();
        }
    }

    // Фильтрация задач
    filterTasks(filter) {
        this.currentFilter = filter;
        
        // Обновляем активную кнопку фильтра
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
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
            default:
                return [...this.tasks];
        }
    }

    // Форматирование даты для отображения
    formatDate(date) {
        const taskDate = new Date(date);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (taskDate >= today && taskDate < tomorrow) {
            return 'Сегодня';
        } else if (taskDate >= tomorrow && taskDate < new Date(tomorrow.getTime() + 24*60*60*1000)) {
            return 'Завтра';
        } else {
            const options = { day: 'numeric', month: 'short' };
            return taskDate.toLocaleDateString('ru-RU', options);
        }
    }

    // Отрисовка задач
    renderTasks() {
        const container = document.getElementById('tasks-container');
        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            const emptyState = document.getElementById('empty-state');
            emptyState.style.display = 'block';
            container.innerHTML = '';
            container.appendChild(emptyState);
            return;
        }
        
        // Скрываем пустое состояние
        document.getElementById('empty-state').style.display = 'none';
        
        // Сортируем задачи: сначала невыполненные, потом выполненные
        // Внутри каждой группы - по дате (сегодняшние и завтрашние сначала)
        const sortedTasks = filteredTasks.sort((a, b) => {
            // Сначала по статусу выполнения
            if (a.done !== b.done) {
                return a.done ? 1 : -1;
            }
            
            // Затем по дате
            return new Date(a.date) - new Date(b.date);
        });
        
        // Создаем HTML для задач
        let tasksHTML = '';
        
        sortedTasks.forEach(task => {
            const dateStr = this.formatDate(task.date);
            
            tasksHTML += `
                <div class="task ${task.done ? 'done' : ''}" data-id="${task.id}">
                    <div class="task-checkbox">
                        <input type="checkbox" id="task-${task.id}" ${task.done ? 'checked' : ''}>
                        <label for="task-${task.id}" class="checkmark"></label>
                    </div>
                    <div class="task-content">
                        <div class="task-subject">${this.escapeHtml(task.subject)}</div>
                        <div class="task-text">${this.escapeHtml(task.text)}</div>
                        <div class="task-date">${dateStr}</div>
                    </div>
                    <div class="task-actions">
                        <button class="delete-btn" title="Удалить задание">×</button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = tasksHTML;
        
        // Добавляем обработчики событий для новых элементов
        this.attachTaskEventListeners();
    }

    // Экранирование HTML для безопасности
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
                const taskId = parseInt(e.target.closest('.task').dataset.id);
                this.deleteTask(taskId);
            });
        });
    }

    // Настройка основных обработчиков событий
    setupEventListeners() {
        // Кнопка добавления задачи
        document.getElementById('add-task').addEventListener('click', () => {
            const subject = document.getElementById('subject').value;
            const text = document.getElementById('task-text').value;
            const dateOption = document.querySelector('input[name="date"]:checked').value;
            
            this.addTask(subject, text, dateOption);
        });

        // Добавление по нажатию Enter в поле предмета
        document.getElementById('subject').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('task-text').focus();
            }
        });

        // Добавление по нажатию Ctrl+Enter в поле текста
        document.getElementById('task-text').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                const subject = document.getElementById('subject').value;
                const text = document.getElementById('task-text').value;
                const dateOption = document.querySelector('input[name="date"]:checked').value;
                
                this.addTask(subject, text, dateOption);
            }
        });

        // Фильтры
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                this.filterTasks(filter);
            });
        });
    }

    // Регистрация Service Worker для PWA
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('service-worker.js')
                    .then(registration => {
                        console.log('ServiceWorker зарегистрирован:', registration.scope);
                    })
                    .catch(error => {
                        console.log('Ошибка регистрации ServiceWorker:', error);
                    });
            });
        }
    }

    // Настройка подсказки об установке PWA
    setupPWAInstallPrompt() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            // Предотвращаем автоматическое отображение подсказки
            e.preventDefault();
            deferredPrompt = e;
            
            // Показываем свою подсказку (можно добавить кнопку в интерфейс)
            // В данном случае просто сохраняем событие для использования позже
            console.log('PWA может быть установлено');
        });
        
        window.addEventListener('appinstalled', () => {
            console.log('Приложение установлено');
            deferredPrompt = null;
        });
    }
}

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    const app = new FastLessonsApp();
});
