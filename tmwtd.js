    REPEAT_TYPE_NONE = 0;
    REPEAT_TYPE_HOURLY = 1;
    REPEAT_TYPE_DAILY = 2;
    REPEAT_TYPE_WEEKLY = 3;
    REPEAT_TYPE_MONTHLY = 4;
    REPEAT_TYPE_YEARLY = 5;
    PRIORITY_LOW = 1;
    PRIORITY_MEDIUM = 2;
    PRIORITY_HIGH = 4;
    PRIORITY_URGENT = 64;
    LAST_DAY_OF_MONTH = 32;
    ANY_DAY_OF_MONTH = 0;
    ANY_DAY_OF_WEEK = 0;
    ANY_MONTH = 0;
    ANY_TIME = -1;
    END_OF_DAY = 24 * 60 - 1;
    START_OF_DAY = 0;
    GO_NONE = 0;
    GO_EXEC = 1;
    GO_AVAIL = 2;

    let isEditMode=false;
    let taskToAddEdit=null;
    let taskHasErrors=false;
    let errors="";
    let summary="";
    let onMainScreen=true;
    let waitingForTasks=false;

    const shortMonth = ["Any Day","Last Day","1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th","13th","14th","15th","16th","17th","18th","19th","20th","21st","22nd","23rd","24th","25th","26th","27th","28th"];
    const shortMonthInt = [0,32,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28];
    const longMonth = ["Any Day","1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th","13th","14th","15th","16th","17th","18th","19th","20th","21st","22nd","23rd","24th","25th","26th","27th","28th","29th","30th","31st"];
    const longMonthInt = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31];
    const weekdays = ["Any Day","Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const months = ["","January","February","March","April","May","June","July","August","September","October","November","December"];

    //contains all tasks and the current task if any
    class Tasks
    {
        constructor()
        {
            this.tasks = new Object;
            this.currentTaskId = null;
        }
    }

    //a single task
    class Task
    {
        constructor()
        {
            this.description = "";
            this.done = false;
            this.weight = PRIORITY_LOW;
            this.repeatType = REPEAT_TYPE_NONE;
            this.repeatInterval = 0;
            this.id = self.crypto.randomUUID();
            this.dependencies = [];
            this.lastRun = 0;
            this.minute = ANY_TIME;
            this.dayOfMonth = ANY_DAY_OF_MONTH;
            this.dayOfWeek = ANY_DAY_OF_WEEK;
            this.month = ANY_MONTH;
            this.minMinute = 0;
            this.maxMinute = 24 * 60 - 1;
        }
    }

    // display the current screen
    function showScreen(screenId, mode)
    {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        if (screenId === 'main-screen')
        {
            updateMainScreenState();
            lastScreen = "main-screen";
            onMainScreen=true;
        }
        else
        {
            onMainScreen=false;
        }
        if (screenId === 'add-edit-screen')
        {
            document.getElementById('add-edit-heading').textContent = (mode === 'edit') ? 'Edit Task' : 'Add Task';
            isEditMode = (mode === 'edit');
        }
    }


    //set add mode and populate add/edit fields
    function addTask()
    {
        taskToAddEdit=new Task();
        fillScreenFromTask();
        showScreen('add-edit-screen','add');
    }

     //set edit mode and populate add/edit fields
     function editTask(taskId)
     {
         taskToAddEdit=getTaskById(taskId);
         fillScreenFromTask();
         showScreen('add-edit-screen','edit');
     }

    //populate the add/edit screen with the selected task
    function fillScreenFromTask()
    {
        let task=taskToAddEdit;
        //fields
        let descriptionFld = document.getElementById("task-desc");
        let priorityFld = document.getElementById("task-priority");
        let repeatsFld = document.getElementById("task-repeats");
        let repeatIntervalFld = document.getElementById("repeat-interval");
        let repeatTypeFld = document.getElementById("repeat-type");
        let weekdayFld = document.getElementById("repeat-weekday");
        let monthFld = document.getElementById("repeat-month");
        let dayFld = document.getElementById("repeat-day");
        let timeFld = document.getElementById("repeat-time");
        let startTimeFld = document.getElementById("repeat-start-time");
        let endTimeFld = document.getElementById("repeat-end-time");
        //clear all fields to start with
        descriptionFld.value="";
        priorityFld.value=PRIORITY_LOW;
        repeatsFld.checked=false;
        repeatIntervalFld.value=1;
        repeatTypeFld.value=REPEAT_TYPE_DAILY;
        weekdayFld.value=ANY_DAY_OF_WEEK;
        monthFld.value=ANY_MONTH;
        dayFld.value=ANY_DAY_OF_MONTH;
        timeFld.value="";
        startTimeFld.value="";
        endTimeFld.value="";

        //fill in fields
        descriptionFld.value=task.description;
        priorityFld.value=task.weight;
        repeatsFld.checked=(task.repeatType!=REPEAT_TYPE_NONE);
        repeatsFld.dispatchEvent(new Event('change'));
        if(task.repeatType!=REPEAT_TYPE_NONE)
        {
            repeatTypeFld.value=task.repeatType;
            repeatTypeFld.dispatchEvent(new Event('change'));
            repeatIntervalFld.value=task.repeatInterval;
            weekdayFld.value=task.dayOfWeek;
            monthFld.value=task.month;
            dayFld.value=task.dayOfMonth;
            timeFld.value=minutesToTime(task.minute);
            startTimeFld.value=minutesToTime(task.minMinute);
            endTimeFld.value=minutesToTime(task.maxMinute);
        }
        //load dependency list
        document.getElementById('dependency-list').innerHTML = '';
        let deps=getPossibleDependencyTasks();
        deps.forEach(task =>
        {
            let checked=taskToAddEdit.dependencies.includes(task.id);
            addDependencyToList(task,checked);
        }
        );
    }

    //set task attributes from add/edit screen
    function fillTaskFromScreen()
    {
        taskHasErrors=false;
        if(taskToAddEdit==null) taskToAddEdit = new Task();
        let task=taskToAddEdit;
        //fields
        let descriptionFld = document.getElementById("task-desc");
        let priorityFld = document.getElementById("task-priority");
        let repeatsFld = document.getElementById("task-repeats");
        let repeatIntervalFld = document.getElementById("repeat-interval");
        let repeatTypeFld = document.getElementById("repeat-type");
        let weekdayFld = document.getElementById("repeat-weekday");
        let monthFld = document.getElementById("repeat-month");
        let dayFld = document.getElementById("repeat-day");
        let timeFld = document.getElementById("repeat-time");
        let startTimeFld = document.getElementById("repeat-start-time");
        let endTimeFld = document.getElementById("repeat-end-time");
        //fill and validate task
        task.description=descriptionFld.value;
        summary="You want to:\n"
        errors="";
        if(task.description=="")
        {
            taskHasErrors=true;
            errors+="Description can't be empty.\n"
        }
        summary+=task.description+"\n";
        task.weight=priorityFld.value;
        task.repeatType=REPEAT_TYPE_NONE;
        if(repeatsFld.checked)
        {
            let day="";
            let dayInt=parseInt(dayFld.value);
            let monthInt=parseInt(monthFld.value);
            let month=months[monthInt];
            task.repeatType=parseInt(repeatTypeFld.value);
            task.month=parseInt(monthFld.value);
            if(task.repeatType==REPEAT_TYPE_MONTHLY)
            {
                day=shortMonth[shortMonthInt.indexOf(dayInt)];
                task.dayOfMonth=dayInt;
            }
            else (task.repeatType==REPEAT_TYPE_YEARLY)
            {
                day=longMonth[longMonthInt.indexOf(dayInt)];
                task.dayOfMonth=dayInt;
            }
            if(repeatIntervalFld.value=="")
            {
                errors+="Repeat interval can't be empty.\n";
                taskHasErrors = true;
            }
            else
            {
                task.repeatInterval=parseInt(repeatIntervalFld.value);
            }
            task.minute=ANY_TIME;
            if(timeFld.value!="") task.minute=timeToMinutes(timeFld.value);
            switch(parseInt(repeatTypeFld.value))
            {
                case REPEAT_TYPE_HOURLY:
                {
                    let start=startTimeFld.value==""?0:timeToMinutes(startTimeFld.value);
                    let end=endTimeFld.value==""?(24*60-1):timeToMinutes(endTimeFld.value);
                    task.minMinute=start;
                    task.maxMinute=end;
                    if(parseInt(start)>parseInt(end))
                    {
                        errors+="Start time should be earlier than end time.";
                        taskHasErrors=true;
                    }
                    summary+="Every "+ task.repeatInterval + " hour(s)\n";
                    summary+="Between "+ minutesToTime12(task.minMinute) + " and " + minutesToTime12(task.maxMinute)+"\n";
                    break;
                }
                case REPEAT_TYPE_YEARLY:
                {
                    summary+="Every "+ task.repeatInterval + " year(s)\n";
                    if(timeFld.value!="")
                    {
                        summary+="At "+ minutesToTime12(task.minute) + "\n";
                    }
                    if(dayFld.value==LAST_DAY_OF_MONTH)
                    {
                        summary+="On the last day\n";
                    }
                    else if(dayFld.value!=ANY_DAY_OF_MONTH)
                    {
                        summary+="On the "+day+"\n";
                    }
                    summary+="In "+month+"\n";
                    if(monthInt==2 && dayInt>29)
                    {
                        errors+=month+" "+day+" isn't valid.\n";
                        taskHasErrors=true;
                    }
                    else if((monthInt==4 || monthInt==6 || monthInt==9 || monthInt==11) && dayInt>30)
                    {
                        errors+=month+" "+day+" isn't valid.\n";
                    }
                    break;
                }
                case REPEAT_TYPE_MONTHLY:
                {
                    summary+="Every "+ task.repeatInterval + " month(s)\n";
                    if(timeFld.value!="")
                    {
                        summary+="At "+ minutesToTime12(task.minute) + "\n";
                    }
                    if(dayFld.value==LAST_DAY_OF_MONTH)
                    {
                        summary+="On the last day\n";
                    }
                    else if(dayFld.value!=ANY_DAY_OF_MONTH)
                    {
                        summary+="On the "+day+"\n";
                    }
                    break;
                }
                case REPEAT_TYPE_WEEKLY:
                {
                    task.dayOfWeek=parseInt(weekdayFld.value);
                    summary+="Every "+ task.repeatInterval + " week(s)\n";
                    if(timeFld.value!="")
                    {
                        summary+="At "+ minutesToTime12(task.minute) + "\n";
                    }
                    if(weekdayFld.value!=ANY_DAY_OF_WEEK)
                    {
                        summary+="On "+ weekdays[weekdayFld.value] + "\n";
                    }
                    break;
                }
                case REPEAT_TYPE_DAILY:
                {
                    summary+="Every "+ task.repeatInterval + " day(s)\n";
                    if(timeFld.value!="")
                    {
                        summary+="At "+ minutesToTime12(task.minute) + "\n";
                    }
                    break;
                }
            }
        }
        summary+="\nLooks good?"
        task.dependencies=getCheckedDependencyUUIDs();
        if(taskHasErrors)
        {
            showModal("Errors", errors,
            [
            {
                text: "OK"
            }]);
        }
        else
        {
            showModal("Just checking...", summary,
            [
            {
                text: "YEP!",
                onClick: () =>
                {
                    if(task.lastRun==0) task.lastRun=getDefaultLastRun(task);
                    tasks.tasks[task.id]=task;
                    save();
                    addEditCancel();
                }

            },
            {
                text: "NOPE!"
            },
            ]);
        }
    }

    //save the task
    function saveTask()
    {
        fillTaskFromScreen();
    }

    //convert HH:mm to minutes
    function timeToMinutes(time)
    {
        let minutes=parseInt(time.substring(0, 2))*60+parseInt(time.substring(3, 5));
        return minutes;
    }

    //convert minutes to HH:mm
    function minutesToTime(minutes)
    {
        if(minutes<0)
        {
            return "";
        }
        else
        {
            return pad(Math.floor(minutes/60),2)+":"+pad(minutes%60,2);
        }
    }

    //convert minutes to hh:mm AM/PM
    function minutesToTime12(minutes)
    {
        if(minutes<0)
        {
            return "";
        }
        else
        {
            let ap=" AM";
            let hours = Math.floor(minutes/60);
            if(hours>=12)
            {
                ap=" PM";
            }
            if(hours==0)
            {
                hours=12;
            }
            else if(hours>12)
            {
                hours-=12;
            }
            return hours+":"+pad(minutes%60,2)+ap;
        }
    }

    //pad a number with leading zeros
    function pad(num, size) {
        var s = "000000000" + num;
        return s.substr(s.length-size);
    }

    // Set main screen state
    function updateMainScreenState()
    {
        const goBtn = document.getElementById("go-btn");
        const taskText = document.getElementById("main-task-text");
        let taskId = tasks.currentTaskId;
        let state = GO_NONE;
        let task = null;

        if (taskId == null) //no current task
        {
            let available = getAvailableTasks().length > 0;
            if (available) state = "avail"; //tasks are available
        }
        else //currently executing task
        {
            state = GO_EXEC;
            task = getTaskById(taskId);
        }

        switch(state)
        {
            case GO_NONE:
                taskText.textContent="Looks like there's nothing to do right now. You could take a break, or maybe add some more tasks.";
                goBtn.classList.add("hidden");
                waitingForTasks=true;
                break;
            case GO_EXEC:
                taskText.textContent=task.description;
                goBtn.classList.remove("hidden");
                goBtn.textContent="DONE";
                goBtn.onclick = function() { finishTask(); }
                waitingForTasks=false;
                break;
            default:
                taskText.textContent="There's something for you to do. Ready to go?";
                goBtn.classList.remove("hidden");
                goBtn.textContent="OK, I'M READY";
                goBtn.onclick = function() { startTask(); };
                waitingForTasks=false;
        }
console.log("check...");
        if(waitingForTasks && onMainScreen)
        {
            setTimeout(function() { updateMainScreenState(); }, 1000*60);
        }
    }

    //start a task
    function startTask()
    {
        let task = getNextTask();
        updateMainScreenState();
    }

    //finish a task
    function finishTask()
    {
        let task = getTaskById(tasks.currentTaskId);
        if(task==null)
        {
            tasks.currentTaskId=null;
        }
        else
        {
            task.lastRun=new Date().getTime();
            if(task.repeatType==REPEAT_TYPE_NONE)
            {
                task.done=true;
            }
            else
            {
                task.done=false; //repeating tasks are never done
            }
        }
        tasks.currentTaskId=null;
        updateMainScreenState();
    }

    // Show a modal dialog
    function showModal(title, body, buttons)
    {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').textContent = body;
        const actions = document.getElementById('modal-actions');
        actions.innerHTML = '';
        buttons.forEach(btn =>
        {
            const b = document.createElement('button');
            b.className = 'modal-btn';
            b.textContent = btn.text;
            b.onclick = () =>
            {
                hideModal();
                if (btn.onClick) btn.onClick();
            };
            actions.appendChild(b);
        });
        document.getElementById('modal-overlay').style.display = 'flex';
    }

    //close a modal dialog
    function hideModal()
    {
        document.getElementById('modal-overlay').style.display = 'none';
    }

    //set event listener to show/hide task repeat controls
    document.getElementById('task-repeats').addEventListener('change', function()
    {
        document.getElementById('repeat-section').style.display = this.checked ? '' : 'none';
        document.getElementById('repeat-type').dispatchEvent(new Event('change'));
    });

    //set repeat section visibility based on repeat type
    document.getElementById('repeat-type').addEventListener('change', function()
    {

        let val = this.value;
        document.getElementById('repeat-weekday-section').style.display = (val == REPEAT_TYPE_WEEKLY) ? '' : 'none';
        document.getElementById('repeat-month-section').style.display = (val == REPEAT_TYPE_YEARLY) ? '' : 'none';
        document.getElementById('repeat-day-section').style.display = (val == REPEAT_TYPE_MONTHLY || val == REPEAT_TYPE_YEARLY) ? '' : 'none';
        document.getElementById('repeat-time-section').style.display = (val == REPEAT_TYPE_DAILY || val == REPEAT_TYPE_WEEKLY || val == REPEAT_TYPE_MONTHLY || val == REPEAT_TYPE_YEARLY) ? '' : 'none';
        document.getElementById('repeat-between-section').style.display = (val == REPEAT_TYPE_HOURLY) ? '' : 'none';
        if(val==REPEAT_TYPE_MONTHLY)
        {
            fillShortMonth()

        }
        if(val==REPEAT_TYPE_YEARLY)
        {
            fillLongMonth();
        }
    });

    //set 31 days in the day dropdown when yearly task
    function fillLongMonth()
    {
        let dayFld = document.getElementById("repeat-day");
        dayFld.innerHTML = '';
        for(let i=0;i<longMonth.length;i++)
        {
            const item = document.createElement('option');
            item.textContent=longMonth[i];
            item.value=longMonthInt[i];
            dayFld.appendChild(item);
        }
    }

    //set 28 days in the day dropdown when monthly task
    function fillShortMonth()
    {
        let dayFld = document.getElementById("repeat-day");
        dayFld.innerHTML = '';
        for(let i=0;i<shortMonth.length;i++)
        {
            const item = document.createElement('option');
            item.textContent=shortMonth[i];
            item.value=shortMonthInt[i];
            dayFld.appendChild(item);
        }
    }

    //set repeat time to empty string
    function clearRepeatTime()
    {
        document.getElementById('repeat-time').value = '';
    }

    //set start/end times to empty string
    function clearRepeatTimes()
    {
        document.getElementById('repeat-start-time').value = '';
        document.getElementById('repeat-end-time').value = '';
    }

    // Backup tasks
    function backupTasks()
    {
        var data = JSON.stringify(tasks);
        var currentTime = new Date();
        var ts = currentTime.getFullYear().toString() +
            String(currentTime.getMonth() + 1).padStart(2, '0') +
            String(currentTime.getDate()).padStart(2, '0') +
            "_" +
            String(currentTime.getHours()).padStart(2, '0') +
            String(currentTime.getMinutes()).padStart(2, '0') +
            String(currentTime.getSeconds()).padStart(2, '0');
        var filename = "TMWTD_tasks_" + ts + ".json";
        var blob = new Blob([data],
        {
            type: 'application/json'
        });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // Restore tasks
    function restoreTasks()
    {
        let fileInput = document.getElementById('file-input');
        fileInput.value = '';
        fileInput.onchange = function(e)
        {
            let file = e.target.files[0];
            if (file)
            {
                let reader = new FileReader();
                reader.onload = function(evt)
                {
                    let text = evt.target.result;
                    tasks = JSON.parse(text);
                    save();
                    showModal("Restore", "Restore loaded.", [
                    {
                        text: "OK"
                    }]);
                };
                reader.readAsText(file);
            }
        };
        fileInput.click();
    }

    //add a task to the dependency tasks list
    function addDependencyToList(task,checked)
    {
        const depList = document.getElementById('dependency-list');
        // Create the dependency-item item container
        const item = document.createElement('div');
        item.className = 'dependency-item';
        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.className = 'list-checkbox';
        checkbox.type = 'checkbox';
        checkbox.checked = checked;
        // Description
        const desc = document.createElement('span');
        desc.className = 'task-desc';
        desc.textContent = task.description.substring(0,50);
        // Hidden UUID
        const hidden = document.createElement('span');
        hidden.className = 'uuid-field';
        hidden.textContent = task.id;
        // Assemble
        item.appendChild(checkbox);
        item.appendChild(desc);
        item.appendChild(hidden);
        // Add to list
        depList.appendChild(item);
    }

    //add a task to the view tasks list
    function addTaskToList(task)
    {
        const taskList = document.getElementById('task-list');
        var st = task.done ? "Done" : (isTaskAvailable(task) ? "Ready" : "Waiting");
        // Create the task item container
        const item = document.createElement('div');
        item.className = 'task-item status-' + (
            st === 'Ready' ? 'green' :
            st === 'Done' ? 'red' :
            'orange'
        );
        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className='list-checkbox';
        // Description
        const desc = document.createElement('span');
        desc.className = 'task-desc';
        desc.textContent = task.description.substring(0,50);
        // Status
        const status = document.createElement('span');
        status.className = 'task-status';
        status.textContent = st;
        // Hidden UUID
        const hidden = document.createElement('span');
        hidden.className = 'uuid-field';
        hidden.textContent = task.id;
        desc.onclick = function() {
            editTask(hidden.textContent);
        };
        // Assemble
        item.appendChild(checkbox);
        item.appendChild(desc);
        item.appendChild(status);
        item.appendChild(hidden);
        // Add to list
        taskList.appendChild(item);
    }

    let lastScreen = "main-screen";
    //cancel from add/edit screen
    function addEditCancel()
    {
        if(lastScreen=="view-tasks-screen")
            viewTasks();
        else
            showScreen(lastScreen);
    }

    //switch to view tasks screen
    function viewTasks()
    {
        lastScreen = "view-tasks-screen";
        showScreen('view-tasks-screen');
        document.getElementById('task-list').innerHTML = '';
        for (var id in tasks.tasks)
        {
            var task = getTaskById(id);
            addTaskToList(task);
        }
    }

    //get a task object by its UUID
    function getTaskById(id)
    {
        return tasks.tasks[id];
    }

    //save tasks to browser local storage
    function save()
    {
        localStorage.setItem("TMWTD_tasks", JSON.stringify(tasks));
    }

    //get tasks from browser local storage
    function load()
    {
        var storage = localStorage.getItem("TMWTD_tasks");
        var t = JSON.parse(storage);
        if (t != null)
        {
            tasks = t;
        }
        else
        {
            tasks = new Tasks();
            let task=new Task();
            task.priority=PRIORITY_LOW;
            task.description="Add some tasks for yourself.\nGo to the Add Task screen and add a task (e.g. 'Do dishes', 'Hydrate').";
            tasks.tasks[task.id]=task;
        }
    }

    //get all UUIDs of selected tasks in view tasks list
    function getCheckedTaskUUIDs()
    {
        const checkedUUIDs = [];
        // Get all task-item divs
        const items = document.querySelectorAll('.task-item');
        items.forEach(item =>
        {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked)
            {
                const uuid = item.querySelector('.uuid-field');
                if (uuid)
                {
                    checkedUUIDs.push(uuid.textContent);
                }
            }
        });
        return checkedUUIDs;
    }

    //get all UUIDs of selected tasks in dependency list
    function getCheckedDependencyUUIDs()
    {
        const checkedUUIDs = [];
        // Get all dependency-item divs
        const items = document.querySelectorAll('.dependency-item');
        items.forEach(item =>
        {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked)
            {
                const uuid = item.querySelector('.uuid-field');
                if (uuid)
                {
                    checkedUUIDs.push(uuid.textContent);
                }
            }
        });
        return checkedUUIDs;
    }

    //ask before deleting checked tasks
    function deleteTasksCheck()
    {
        var ids = getCheckedTaskUUIDs();
        if (ids.length == 1)
        {
            showModal("Delete", "Delete this task?", [
            {
                text: "DELETE",
                onClick: () =>
                {
                    deleteTasks();
                }
            },
            {
                text: "CANCEL"
            }]);
        }
        else if (ids.length > 1)
        {
            showModal("Delete", "Delete these " + ids.length + " tasks?", [
            {
                text: "DELETE",
                onClick: () =>
                {
                    deleteTasks();
                    save();
                }
            },
            {
                text: "CANCEL"
            }]);
        }
    }

    //delete checked tasks
    function deleteTasks()
    {
        var ids = getCheckedTaskUUIDs();
        ids.forEach(id =>
        {
            delete tasks.tasks[id];
        });
        save();
        viewTasks();
    }

    //delete checked tasks
    function requeueTasks()
    {
        var ids = getCheckedTaskUUIDs();
        ids.forEach(id =>
        {
            tasks.tasks[id].done=false;
        });
        save();
        viewTasks();
    }

    //check to see if task is available
    function isTaskAvailable(task)
    {
        //default to not done
        var available = !task.done;
        //for repeating a repeating task, it's not available if it's not due
        if (task.repeatType != REPEAT_TYPE_NONE)
        {
            var due = getDueTime(task);
            var currentTime = new Date().getTime();
            available = (due <= currentTime);
        }
        //also not available if any of its dependencies are not done or waiting
        var missingDependencies = [];
        for (let i=0;i<task.dependencies.length;i++)
        {
            let id=task.dependencies[i];
            let dep = getTaskById(id);
            if (dep == null)
            {
                missingDependencies.push(id);
            }
            else
            {
                if (dep.repeatType == REPEAT_TYPE_NONE) //dependency is non-repeating -> check done
                {
                    available = available && dep.done;
                }
                else //dependency is repeating -> check last run (repeating tasks are never done)
                {
                    if (dep.lastRun < task.lastRun) available = false;
                }
                for (let i=0;i<missingDependencies.length;i++)//remove missing dependencies
                {
                    let id = missingDependencies[i];
                    const index = task.dependencies.indexOf(id);
                    if (index > -1)
                    {
                        task.dependencies.splice(index, 1);
                    }
                }
            }
        }
        return available;
    }

    //get the due time of the task
    function getDueTime(task)
    {
        var due = new Date();
        if (task.lastRun > 0)
            due.setTime(task.lastRun); //if there is a last run, use that instead
        var minute = (task.minute == ANY_TIME) ? 0 : task.minute % 60;
        var hour = (task.minute == ANY_TIME) ? 0 : Math.floor(task.minute / 60);
        var dayOfMonth = task.dayOfMonth;
        var dayOfWeek = task.dayOfWeek;

        switch (task.repeatType)
        {
            case REPEAT_TYPE_HOURLY: //repeating 1 or more hours
                //add the number of hours
                due.setHours(due.getHours() + task.repeatInterval);
                var dueMinute = due.getHours() * 60 + due.getMinutes();
                if (dueMinute > task.maxMinute) //if after the end of the day, go to next day
                {
                    due.setDate(due.getDate() + 1);
                    due.setHours(Math.floor(task.minMinute / 60));
                    due.setMinutes(task.minMinute % 60);
                }
                else if (dueMinute < task.minMinute) //if before the start of the day, set to start of day
                {
                    due.setHours(Math.floor(task.minMinute / 60));
                    due.setMinutes(task.minMinute % 60);
                }
                break;
            case REPEAT_TYPE_DAILY: //repeating 1 or more days
                due.setDate(due.getDate() + task.repeatInterval);
                due.setHours(hour);
                due.setMinutes(minute);
                break;
            case REPEAT_TYPE_WEEKLY: //repeating 1 or more weeks
                due.setDate(due.getDate() + task.repeatInterval * 7);
                if (dayOfWeek != ANY_DAY_OF_WEEK)
                    due.setDate(due.getDate() + ((task.dayOfWeek - 1 - due.getDay() + 7) % 7)); //messy stuff to set 0-6 day of week from 1-7 day of week
                due.setHours(hour);
                due.setMinutes(minute);
                break;
            case REPEAT_TYPE_MONTHLY: //repeating 1 or more months
                due.setDate(1);
                due.setMonth(due.getMonth() + task.repeatInterval); //add the number of months
                if (dayOfMonth == LAST_DAY_OF_MONTH) //if last day of month, end of month
                {
                    due = new Date(due.getFullYear(), due.getMonth() + 1, 0);
                }
                else if (dayOfMonth != ANY_DAY_OF_MONTH) //if not any day, use day
                    dayOfMonth = task.dayOfMonth;
                due.setDate(dayOfMonth);
                due.setHours(hour);
                due.setMinutes(minute);
                break;
            case REPEAT_TYPE_YEARLY: //repeating 1 or more years
                var h = due.getHours();
                var m = due.getMinutes();
                due = new Date(due.getFullYear() + task.repeatInterval, task.month - 1, 1);
                due.setHours(h);
                due.setMinutes(m);
                if (dayOfMonth == LAST_DAY_OF_MONTH) //if last day of month, end of month
                {
                    due = new Date(due.getFullYear(), due.getMonth() + 1, 0);
                }
                else if (dayOfMonth != ANY_DAY_OF_MONTH) //if not any day, use day
                    dayOfMonth = task.dayOfMonth;
                due.setDate(dayOfMonth);
                due.setHours(hour);
                due.setMinutes(minute);
                break;
            default:
                break;
        }
        return due.getTime();
    }

    //get all available tasks
    function getAvailableTasks()
    {
        var availableTasks = [];
        Object.values(tasks.tasks).forEach(task =>
        {
            if (isTaskAvailable(task)) availableTasks.push(task);
        });
        return availableTasks;
    }


    //get all  tasks
    function getAllTasks()
    {
        var allTasks = [];
        Object.values(tasks.tasks).forEach(task =>
        {
            allTasks.push(task);
        });
        return allTasks;
    }

    //get all possible dependency tasks
    //TODO: add circular dependency checks
    function getPossibleDependencyTasks()
    {
        let possibleDependencyTasks=[];
        let allTasks = getAllTasks();
        allTasks.forEach(task =>
        {
            if(!isDependentOn(task,taskToAddEdit)&&task!=taskToAddEdit)
            {
                possibleDependencyTasks.push(task);
            }
        });
        return possibleDependencyTasks;
    }

    //is this task dependent on other task?
    function isDependentOn(thisTask,task)
    {
        if(thisTask.dependencies.includes(task.id)) return true; //direct dependency
        for(let i=0;i<thisTask.dependencies.length;i++) //recursive dependency
        {
            let id = thisTask.dependencies[i];
            let dependency = getTaskById(id);
            if(isDependentOn(dependency,task))
            {
                return true;
            }
        }
    }

    //get the default last run time for a new task
    function getDefaultLastRun(task)
    {
        let lastRun = new Date();
        let currentTime = new Date().getTime();
        let interval = task.repeatInterval;
        switch(task.repeatType)
        {
            case REPEAT_TYPE_HOURLY:
                break;
            case REPEAT_TYPE_DAILY:
                if(task.minute != ANY_TIME)
                {
                    lastRun.setHours(Math.floor(task.minute/60));
                    lastRun.setMinutes(task.minute%60);
                    lastRun.setDate(lastRun.getDate()+((lastRun.getTime() > currentTime) ? 0 : 1) - interval);
                    if(lastRun.getTime()>currentTime)
                        lastRun.setDate(lastRun.getDate()-1);
                }
                break;
            case REPEAT_TYPE_WEEKLY:
                if (task.minute != ANY_TIME)
                {
                    lastRun.setHours(Math.floor(task.minute/60));
                    lastRun.setMinutes(task.minute%60);
                }
                if (task.dayOfWeek != ANY_DAY_OF_WEEK)
                {
                    lastRun.setDate(lastRun.getDate() + ((task.dayOfWeek - 1 - lastRun.getDay() + 7) % 7));
                }
                lastRun.setDate(lastRun.getDate()+(((lastRun.getTime() > currentTime) ? 0: 1) - interval)*7);
                break;
            case REPEAT_TYPE_MONTHLY:
                if (task.minute != ANY_TIME)
                {
                    lastRun.setHours(Math.floor(task.minute/60));
                    lastRun.setMinutes(task.minute%60);
                }
                if (task.dayOfMonth != ANY_DAY_OF_MONTH)
                {
                    lastRun.setDate(task.dayOfMonth);
                }
                lastRun.setMonth(lastRun.getMonth()+((lastRun.getTime() > currentTime) ? 0 : 1) - interval);
                break;
            case REPEAT_TYPE_YEARLY:
                if (task.minute != ANY_TIME)
                {
                    lastRun.setHours(Math.floor(task.minute/60));
                    lastRun.setMinutes(task.minute%60);
                }
                if (task.dayOfMonth != ANY_DAY_OF_MONTH)
                {
                    lastRun.setDate(task.dayOfMonth);
                }
                if (task.month != ANY_MONTH)
                {
                    lastRun.setMonth(task.month-1);
                }
                lastRun.setFullYear(lastRun.getFullYear()+((lastRun.getTime() > currentTime) ? 0 : 1) - interval);
                break;
            }
        return lastRun.getTime();
    }


    //gets next task
    function getNextTask()
    {
        let availableTasks = getAvailableTasks();
        if (availableTasks.length > 0)
        {
            //get the total of all weights
            let totalWeight = 0;
            availableTasks.forEach(task =>
            {
                totalWeight += task.weight;
            });
            //get a random number between 0 and the total weight
            let randomWeight = Math.floor(Math.random() * totalWeight);
            //get the task with the random weight
            let currentWeight = 0;
            for(let i=0;i<availableTasks.length;i++)
            {
                let task=availableTasks[i];
                currentWeight += task.weight;
                if (currentWeight >= randomWeight)
                {
                   tasks.currentTaskId = task.id;
                   return task;
                }
            }
        }
        tasks.currentTaskId = null;
        return null; //no tasks available
    }



    var tasks = new Tasks();
    load();
    updateMainScreenState();