import { dispatch as d3_dispatch } from 'd3-dispatch';
import { json as d3_json, text as d3_text } from 'd3-fetch';
import { utilRebind } from '../util';

import rbush from 'rbush';

var dispatch = d3_dispatch('loadedProject', 'loadedTask', 'loadedTasks');

var apibase = 'http://127.0.0.1:5000/api/v1/'; // TODO: change to real url when published
var _tasksCache;

function parseUrl(url) {
    var parsedUrl = {};

    // TODO: get finish regex to get url type
    var project_re = new RegExp(/http:\/\/127.0.0.1:5000\/api\/v1\/project\/[0-9]/);
    var task_re = new RegExp(/http:\/\/127.0.0.1:5000\/api\/v1\/project\/[0-9]+\/task\/[0-9]+$/);

    var _project = project_re.test(url);
    var _task = task_re.test(url);

    parsedUrl.urlType = _task ? 'task' : _project ? 'project' : undefined;
    var url_slugs = url.split('/');

    if (_task) {
        parsedUrl.taskId = url_slugs[url_slugs.length - 1];
    }

    if (_project) {
        if(_task) {
            parsedUrl.projectId = url_slugs[url_slugs.length - 3];
        } else {
            parsedUrl.projectId = url_slugs[url_slugs.length - 1];
        }
    }

    return parsedUrl;
}


export default {

    init: function() {
        utilRebind(this, dispatch, 'on');

        _tasksCache = {
            task: {},
            project: {},
            tasks: rbush()
        };
    },

    reset: function() {
        _tasksCache = {
            task: {},
            project: {},
            tasks: rbush()
        };
    },

    loadProject: function(projectId) {

        var that = this;
        var path = 'project/' + projectId + '?as_file=false';

        var url = apibase + path;
        d3_text(url)
        .then(function(result) {
            if (result) {
                var json = JSON.parse(result);
                _tasksCache.project[projectId] = json;

                // TODO: cache geojson tasks as well
            }
            dispatch.call('loadedProject');
        })
        .catch(function(err) {
            console.log('loadTask error: ', err); // TODO: TAH - better handling of errors
        });
    },

    setProject: function(project) {
        var _projectId = project.projectId;
        _tasksCache.project[_projectId] = project;

    },

    getProject: function(id) {
        return _tasksCache.project[id];
    },

    loadTask: function(projectId, taskId) {

        if (!_tasksCache.task[taskId]) {
            var that = this;
            var path = 'project/' + projectId + '/task/' + taskId + '?as_file=false';

            var url = apibase + path;
            d3_text(url)
            .then(function(result) {
                if (result) {
                    var json = JSON.parse(result);
                    _tasksCache.task[taskId] = json;

                    // also load the project details
                    that.loadProject(projectId);
                }

                dispatch.call('loadedTask');
            })
            .catch(function(err) {
                console.log('loadTask error: ', err) // TODO: TAH - better handling of errors
            });
        }
    },

    getTask: function(id) {
        return _tasksCache.task[id];
    },

    setTask: function(task) {
        var _taskId = task.taskId;
        _tasksCache.task[_taskId] = task;
    },

    getFromUrl: function(url) {

        var that = this;

        var parsedUrl = parseUrl(url);

        switch (parsedUrl.urlType) {
            case 'task':
                that.loadTask(parsedUrl.projectId, parsedUrl.taskId);
                break;
            case 'project':
                that.loadProject(parsedUrl.projectId);
                break;
            case undefined:
                console.log('undefined url result: ', parsedUrl);
                break;
            default:
                break;
        }
    }
};
