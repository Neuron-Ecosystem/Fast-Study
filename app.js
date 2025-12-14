// Fast Lessons - Основное приложение с обновлением в реальном времени
class FastLessonsApp {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.taskToDelete = null;
        this.updateCallbacks = [];
        this.initializeApp();
    }

    // Инициализация приложения
    initializeApp() {
        this.loadTasks();
        this.setupEventListeners();
        this.renderTasks();
        this.updateStats();
        this.registerServiceWorker();
        this.setupPWAInstallPrompt();
        
        // Подписываемся на изменения localStorage (для обновления между вкладками)
        window.addEventListener('storage', (e) => {
            if (e.key === 'fastLessonsTasks') {
                this.loadTasks();
                this.renderTasks();
                this.updateStats();
            }
        });
    }

    // Загрузка задач из localStorage
    loadTasks() {
        const tasksJson = localStorage.getItem('fastLessonsTasks');
        if (tasksJson) {
            try {
                const parsedTasks = JSON.parse(tasksJson);
                // Конвертируем строки дат в объекты Date
                this.tasks = parsedTasks.map(task => ({
                    ...task,
                    date: new Date(task.date)
                }));
                
                // Сортируем задачи по дате и статусу
                this.sortTasks();
            } catch (e) {
                console.error('Ошибка загрузки задач:', e);
                this.tasks = [];
            }
        } else {
            this.tasks = [];
        }
    }

    // Сортировка задач
    sortTasks() {
        this.tasks.sort((a, b) => {
            // Сначала невыполненные, потом выполненные
            if (a.done !== b.done) {
                return a.done ? 1 : -1;
            }
            
            // Затем по дате (ближайшие сначала)
            return new Date(a.date) - new Date(b.date);
        });
    }

    // Сохранение задач в localStorage
    saveTasks() {
        localStorage.setItem('fastLessonsTasks', JSON.stringify(this.tasks));
        // Вызываем все колбэки обновления
        this.updateCallbacks.forEach(callback => callback());
    }

    // Добавление новой задачи с анимацией
    async addTask(subject, text, dateOption) {
        if (!subject.trim() || !text.trim()) {
            this.showNotification('Заполните предмет и текст задания', 'warning');
            return;
        }

        // Анимация кнопки
        const addButton = document.getElementById('add-task');
        const originalText = addButton.innerHTML;
        addButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Добавляем...';
        addButton.disabled = true;

        // Имитация небольшой задержки для лучшего UX
        await new Promise(resolve => setTimeout(resolve, 300));

        const date = new Date();
        
        // Устанавливаем дату в зависимости от выбора
        if (dateOption === 'tomorrow') {
            date.setDate(date.getDate() + 1);
        }
        
        // Устанавливаем время на конец дня (23:59)
        date.setHours(23, 59, 0, 0);

        const newTask = {
            id: Date.now() + Math.random(), // Уникальный ID
            subject: subject.trim(),
            text: text.trim(),
            date: date,
            done: false,
            createdAt: new Date()
        };

        this.tasks.unshift(newTask); // Добавляем в начало
        this.sortTasks();
        this.saveTasks();
        
        // Восстанавливаем кнопку
        addButton.innerHTML = originalText;
        addButton.disabled = false;
        
        // Очищаем форму
        document.getElementById('subject').value = '';
        document.getElementById('task-text').value = '';
        
        // Показываем уведомление
        this.showNotification('Задание добавлено!', 'success');
        
        // Рендерим задачи
        this.renderTasks();
        this.updateStats();
        
        // Фокус на поле предмета
        document.getElementById('subject').focus();
    }

    // Отметка задачи как выполненной/невыполненной
    toggleTaskDone(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            // Анимация переключения
            const taskElement = document.querySelector(`.task[data-id="${taskId}"]`);
            if (taskElement) {
                taskElement.classList.add('task-updating');
                setTimeout(() => {
                    taskElement.classList.remove('task-updating');
                }, 500);
            }
            
            this.tasks[taskIndex].done = !this.tasks[taskIndex].done;
            this.sortTasks();
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            
            // Показываем уведомление
            const status = this.tasks[taskIndex].done ? 'выполнено' : 'активно';
            this.showNotification(`Задание отмечено как ${status}`, 'info');
        }
    }

    // Удаление задачи
    deleteTask(taskId) {
        if (taskId) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.showNotification('Задание удалено', 'danger');
            this.hideDeleteModal();
        }
    }

    // Показать модальное окно удаления
    showDeleteModal(taskId) {
        this.taskToDelete = taskId;
        document.getElementById('delete-modal').classList.add('show');
    }

    // Скрыть модальное окно удаления
    hideDeleteModal() {
        this.taskToDelete = null;
        document.getElementById('delete-modal').classList.remove('show');
    }

    // Фильтрация задач
    filterTasks(filter) {
        this.currentFilter = filter;
        
        // Обновляем активную вкладку фильтра
        document.querySelectorAll('.filter-tab').forEach(tab => {
            if (tab.dataset.filter === filter) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
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
        const dayAfterTomorrow = new Date(tomorrowStart);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
        
        switch(this.currentFilter) {
            case 'today':
                return this.tasks.filter(task => {
                    const taskDate = new Date(task.date);
                    return taskDate >= todayStart && taskDate < tomorrowStart;
                });
            case 'tomorrow':
                return this.tasks.filter(task => {
                    const taskDate = new Date(task.date);
                    return taskDate >= tomorrowStart && taskDate < dayAfterTomorrow;
                });
            case 'pending':
                return this.tasks.filter(task => !task.done);
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
            return { text: 'Сегодня', icon: 'fa-sun', isToday: true };
        } else if (taskDate >= tomorrow && taskDate < new Date(tomorrow.getTime() + 24*60*60*1000)) {
            return { text: 'Завтра', icon: 'fa-moon', isTomorrow: true };
        } else {
            const options = { day: 'numeric', month: 'short' };
            return { 
                text: taskDate.toLocaleDateString('ru-RU', options), 
                icon: 'fa-calendar',
                isToday: false,
                isTomorrow: false
            };
        }
    }

    // Обновление статистики
    updateStats() {
        const todayTasks = this.tasks.filter(task => {
            const taskDate = new Date(task.date);
            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const tomorrowStart = new Date(todayStart);
            tomorrowStart.setDate(tomorrowStart.getDate() + 1);
            
            return taskDate >= todayStart && taskDate < tomorrowStart && !task.done;
        }).length;
        
        const statsElement = document.getElementById('stats-today');
        if (statsElement) {
            statsElement.textContent = `${todayTasks} на сегодня`;
            
            // Анимация обновления статистики
            statsElement.classList.add('task-updating');
            setTimeout(() => {
                statsElement.classList.remove('task-updating');
            }, 500);
        }
    }

    // Отрисовка задач с анимациями
    renderTasks() {
        const container = document.getElementById('tasks-list');
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
        
        // Создаем HTML для задач
        let tasksHTML = '';
        
        filteredTasks.forEach(task => {
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
                                <i class="fas ${dateInfo.icon}"></i>
                                <span>${dateInfo.text}</span>
                            </div>
                            <div class="task-actions">
                                <button class="action-btn delete-btn" title="Удалить задание">
                                    <i class="fas fa-trash-alt"></i>
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
                const taskId = parseFloat(e.target.closest('.task').dataset.id);
                this.toggleTaskDone(taskId);
            });
            
            // Также обработчик для клика по всей области чекбокса
            checkbox.nextElementSibling.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });

        // Обработчики для кнопок удаления
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = parseFloat(e.target.closest('.task').dataset.id);
                this.showDeleteModal(taskId);
            });
        });

        // Клик по задаче (кроме чекбокса и кнопки удаления)
        document.querySelectorAll('.task').forEach(task => {
            task.addEventListener('click', (e) => {
                // Если клик не по чекбоксу или кнопке удаления
                if (!e.target.closest('.task-checkbox') && !e.target.closest('.delete-btn')) {
                    const taskId = parseFloat(task.dataset.id);
                    const checkbox = task.querySelector('.task-checkbox input');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event('change'));
                    }
                }
            });
        });
    }

    // Показать уведомление
    showNotification(message, type) {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                          type === 'warning' ? 'fa-exclamation-triangle' : 
                          type === 'danger' ? 'fa-times-circle' : 
                          'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Добавляем стили
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : 
                        type === 'warning' ? '#FF9800' : 
                        type === 'danger' ? '#F44336' : '#2196F3'};
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
            z-index: 9999;
            animation: slideInRight 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
            max-width: 300px;
        `;
        
        // Добавляем в DOM
        document.body.appendChild(notification);
        
        // Удаляем через 3 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
        
        // Добавляем CSS для анимаций
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
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

    // Настройка основных обработчиков событий
    setupEventListeners() {
        // Кнопка добавления задачи
        document.getElementById('add-task').addEventListener('click', () => {
            const subject = document.getElementById('subject').value;
            const text = document.getElementById('task-text').value;
            const dateOption = document.querySelector('.date-option.active').dataset.date;
            
            this.addTask(subject, text, dateOption);
        });

        // Выбор даты
        document.querySelectorAll('.date-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.date-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
            });
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
                const dateOption = document.querySelector('.date-option.active').dataset.date;
                
                this.addTask(subject, text, dateOption);
            }
        });

        // Фильтры
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const filter = tab.dataset.filter;
                this.filterTasks(filter);
            });
        });

        // Модальное окно удаления
        document.getElementById('cancel-delete').addEventListener('click', () => {
            this.hideDeleteModal();
        });

        document.getElementById('confirm-delete').addEventListener('click', () => {
            this.deleteTask(this.taskToDelete);
        });

        // Закрытие модального окна по клику на фон
        document.getElementById('delete-modal').addEventListener('click', (e) => {
            if (e.target.id === 'delete-modal') {
                this.hideDeleteModal();
            }
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
        const pwaPrompt = document.getElementById('pwa-prompt');
        const installButton = document.getElementById('install-pwa');
        const dismissButton = document.getElementById('dismiss-pwa');
        
        // Показываем подсказку только если приложение еще не установлено
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            // Приложение уже установлено
            return;
        }
        
        window.addEventListener('beforeinstallprompt', (e) => {
            // Предотвращаем автоматическое отображение подсказки
            e.preventDefault();
            deferredPrompt = e;
            
            // Показываем нашу подсказку через 5 секунд после загрузки
            setTimeout(() => {
                pwaPrompt.classList.add('show');
                
                // Сохраняем состояние в localStorage, чтобы не показывать снова
                const pwaDismissed = localStorage.getItem('pwaPromptDismissed');
                if (pwaDismissed) {
                    pwaPrompt.classList.remove('show');
                }
            }, 5000);
        });
        
        // Обработка установки
        if (installButton) {
            installButton.addEventListener('click', async () => {
                if (!deferredPrompt) return;
                
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                
                if (outcome === 'accepted') {
                    console.log('Пользователь принял установку PWA');
                    pwaPrompt.classList.remove('show');
                }
                
                deferredPrompt = null;
            });
        }
        
        // Обработка отказа
        if (dismissButton) {
            dismissButton.addEventListener('click', () => {
                pwaPrompt.classList.remove('show');
                localStorage.setItem('pwaPromptDismissed', 'true');
            });
        }
        
        window.addEventListener('appinstalled', () => {
            console.log('Приложение установлено');
            pwaPrompt.classList.remove('show');
            deferredPrompt = null;
        });
    }
}

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    const app = new FastLessonsApp();
    
    // Автофокус на поле предмета
    document.getElementById('subject').focus();
});
