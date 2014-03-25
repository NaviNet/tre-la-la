function createPercentageCompleteChart(id, complete, size) {
    if (typeof complete === 'string') {
        complete = parseFloat(complete)
    }
    remainder = 100.0 - complete
    title = complete.toString() + "%"
    fontSize = size < 180 ? '16px' : '24px'
    innerSize = size <= 100 ? '75%' : '70%'

    var colors = [ '#BBBBBB', '#00CC66', '#F7464A'];
    $(id).highcharts({
        chart: {
            type: 'pie',
            height: size,
            width: size,
            borderRadius: 0,
            spacing: 0
        },
        credits: {
            enabled: false
        },
        title: {
            text: title,
            align: 'center',
            verticalAlign: 'middle',
            style: { fontSize: fontSize }
        },
        tooltip: false,
        plotOptions: {
            pie: {
                borderWidth: 3,
                startAngle: 90,
                innerSize: innerSize,
                size: '100%',
                shadow: false,
                dataLabels: false,
                stickyTracking: false,
                states: {
                    hover: {
                        enabled: false
                    }
                }
            }
        },
        legend: {
            enabled: false
        },
        series: [{
            data: [
                {y:remainder, color: colors[0] },
                {y:complete, color: colors[1] }
            ]
        }]
    });
}

function createCfdChart(id) {
    $(id).highcharts({
        chart: {
            type: 'area'
        },
        title: {
            text: 'Historic and Estimated Worldwide Population Growth by Region'
        },
        subtitle: {
            text: 'Source: Wikipedia.org'
        },
        xAxis: {
            categories: ['1750', '1800', '1850', '1900', '1950', '1999', '2050'],
            tickmarkPlacement: 'on',
            title: {
                enabled: false
            }
        },
        yAxis: {
            title: {
                text: 'Billions'
            },
            labels: {
                formatter: function() {
                    return this.value / 1000;
                }
            }
        },
        tooltip: {
            shared: true,
            valueSuffix: ' millions'
        },
        plotOptions: {
            area: {
                stacking: 'normal',
                lineColor: '#666666',
                lineWidth: 1,
                marker: {
                    lineWidth: 1,
                    lineColor: '#666666'
                }
            }
        },
        series: [{
            name: 'Asia',
            data: [502, 635, 809, 947, 1402, 3634, 5268]
        }, {
            name: 'Africa',
            data: [106, 107, 111, 133, 221, 767, 1766]
        }, {
            name: 'Europe',
            data: [163, 203, 276, 408, 547, 729, 628]
        }, {
            name: 'America',
            data: [18, 31, 54, 156, 339, 818, 1201]
        }, {
            name: 'Oceania',
            data: [2, 2, 2, 6, 13, 30, 46]
        }]
    });
}

function addWeekdays(date, days) {
    date = moment(date); // use a clone
    while (days > 0) {
        date = date.add(1, 'days');
        // decrease "days" only if it's a weekday.
        if (date.isoWeekday() !== 6 && date.isoWeekday() !== 7) {
            days -= 1;
        }
    }
    return date;
}

function isActiveCol(list) {
    return list != null
        && (list.name.indexOf('Analysis Complete') != -1
            || list.name.indexOf('Implementation') != -1
            || list.name.indexOf('Verification') != -1
            || list.name.indexOf('Release Ready') != -1);
}

function getStoryUnits(cards) {
    var storyUnits = 0;
    $.each(cards, function(i, card) {
        var match = card.name.match(/\[([SML])\]/);
        if (match != null) {
            switch (match[1]) {
                case 'S':
                    storyUnits += 1;
                    break;
                case 'M':
                    storyUnits += 2;
                    break;
                case 'L':
                    storyUnits += 4;
                    break;
            }
        }
    });
    return storyUnits;
}

function getBoardSummaryData(boardId) {
    var confidence = 'TBD';
    var kickoffDate = 'TBD';
    var analysisCompleteDate = 'TBD';
    var releaseReadyDate = 'TBD';
    var releasedOn = 'TBD';
    var plannedStoryUnits = 0;
    var currentStoryUnits = 0;
    var storyUnitsComplete = 0;
    var teamVelocity = 1;

    var deferred = $.Deferred();

    Trello
        .get('boards/' + boardId + '/lists?cards=open')
        .success(function(lists) {
            var analysisCompleteColId = null;

            $.each(lists, function(ix, list) {
                if (isActiveCol(list)) {
                    currentStoryUnits += getStoryUnits(list.cards);
                }

                if (list.name.indexOf('Analysis Complete') != -1) {
                    analysisCompleteColId = list.id;
                }

                if (list.name.indexOf('Release Ready') != -1) {
                    storyUnitsComplete += getStoryUnits(list.cards);
                }

                if (list.name.indexOf('Meta') != -1) {
                    $.each(list.cards, function(ix, card) {
                        var match = card.name.match(/^Confidence:\ (.*)$/);
                        if (match != null && match.length >= 2) {
                            confidence = match[1];
                        }

                        match = card.name.match(/^Kickoff\ Date:\ (.*)$/);
                        if (match != null && match.length >= 2) {
                            kickoffDate = match[1];
                        }

                        match = card.name.match(/^Analysis\ Complete\ Date:\ (.*)$/);
                        if (match != null && match.length >= 2) {
                            analysisCompleteDate = match[1];
                        }

                        match = card.name.match(/^Team\ Velocity\ \(Points\/Day\):\ (.*)$/);
                        if (match != null && match.length >= 2) {
                            teamVelocity = match[1];
                        }

                        match = card.name.match(/^Release\ Ready\ Date:\ (.*)$/);
                        if (match != null && match.length >= 2) {
                            releaseReadyDate = match[1];
                        }

                        match = card.name.match(/^Releases\ On:\ (.*)$/);
                        if (match != null && match.length >= 2) {
                            releasedOn = match[1];
                        }
                    });
                }
            });

            var storyUnitsLeft = currentStoryUnits - storyUnitsComplete;
            var projectedDoneDate = addWeekdays(new Date(), storyUnitsLeft / teamVelocity);

            if (analysisCompleteDate !== 'TBD') {
                var before = moment(analysisCompleteDate).add('days', 1).toISOString();
                Trello
                    .get('boards/' + boardId + '/actions', { before: before, limit: 1000 })
                    .success(function(actions) {
                        var cards = [];
                        var cardIds = [];
                        $.each(actions, function(i, action) {
                            if (action.data.card != null
                                && cardIds.indexOf(action.data.card.id) == -1
                                && (action.data.list == null || isActiveCol(action.data.list))
                                && (action.data.listAfter == null || isActiveCol(action.data.listAfter))) {
                                cards.push(action.data.card);
                                cardIds.push(action.data.card.id);
                            }
                        });
                        plannedStoryUnits = getStoryUnits(cards);

                        percentComplete = (storyUnitsComplete / currentStoryUnits * 100).toFixed(1)
                        deferred.resolve({
                            confidence: confidence,
                            projectedDoneDate: moment(projectedDoneDate).format("MM/DD/YYYY"),
                            kickoffDate: kickoffDate,
                            analysisCompleteDate: analysisCompleteDate,
                            releaseReadyDate: releaseReadyDate,
                            releasedOn: releasedOn,
                            plannedStoryUnits: plannedStoryUnits,
                            currentStoryUnits: currentStoryUnits,
                            storyUnitsComplete: storyUnitsComplete,
                            percentComplete: percentComplete,
                            percentCompleteLabel: percentComplete + '%'
                        });
                    });
            } else {
                percentComplete = (storyUnitsComplete / currentStoryUnits * 100).toFixed(1)
                deferred.resolve({
                    confidence: confidence,
                    projectedDoneDate: moment(projectedDoneDate).format("MM/DD/YYYY"),
                    kickoffDate: kickoffDate,
                    analysisCompleteDate: analysisCompleteDate,
                    releaseReadyDate: releaseReadyDate,
                    releasedOn: releasedOn,
                    plannedStoryUnits: plannedStoryUnits,
                    currentStoryUnits: currentStoryUnits,
                    storyUnitsComplete: storyUnitsComplete,
                    percentComplete: percentComplete,
                    percentCompleteLabel: percentComplete + '%'
                });
            }
        });

    return deferred.promise();
}

function getScopeChangeHistory(boardId) {
    var $scopeChange = $("<div />");
    var $tableScope = $("<table></table>").addClass('confluenceTable');

    $('<th>Change Date</th>').addClass('confluenceTh').appendTo($('<tr></tr>')).appendTo($tableScope);
    $('<th>Change Summary</th>').addClass('confluenceTh').appendTo($('<tr></tr>')).appendTo($tableScope);
    $('<th>Scope Change</th>').addClass('confluenceTh').appendTo($('<tr></tr>')).appendTo($tableScope);
    $('<th>Reason</th>').addClass('confluenceTh').appendTo($('<tr></tr>')).appendTo($tableScope);
//createCard,copyCard,updateCard:idList,moveCardFromBoard,moveCardToBoard,updateCard:closed
   Trello.get('boards/' + boardId + '/actions?filter=createCard,copyCard,updateCard:idList,moveCardFromBoard,moveCardToBoard,updateCard:closed', { limit: 1000 })
   .success(function (cards) {
        //get card with analyis complete date
        var analysisCompleteDate = null;
        $.each(cards, function (ix, card) {
            if(card.type === "createCard") {
                var cardName = card.data.card.name;

                var matches = cardName.match("Analysis Complete Date ?: ?(.*)");
                if (matches != null && matches[1] != "TBD") {
                    analysisCompleteDate = new Date(matches[1]);
                    return false;
                }
            }
        });

        var teamVelocity = 1;
        $.each(cards, function (ix, card) {
            if(card.type === "createCard") {
                var cardName = card.data.card.name;

                var matches = cardName.match("/^Team\ Velocity\ \(Points\/Day\):\ (.*)$/");
                if (matches != null) {
                    teamVelocity = matches[1];
                    return false;
                }
            }
        });

        if (analysisCompleteDate !== null) {
            $.each(cards, function (ix, card) {
                if(card.type === "createCard" || card.type === "copyCard" || card.type === "moveCardFromBoard" || card.type === "moveCardToBoard") {
                    if (isActiveCol(card.data.list)) {
                        var daysDiff = moment(moment(card.date)).diff(moment(analysisCompleteDate), 'days');
                        if (daysDiff > 0) {
                            var weight = "+";
                            if(card.type === "moveCardFromBoard") { weight = "-"; }
                            //get current state of the card
                            appendRowToTable(card.data.card.id, card.date, $tableScope, weight, teamVelocity, card.data.card.name);
                        }
                    }
                }
                else {
                    //TODO: Archived items
                    if(card.type === "updateCard" && card.data.card.closed) {
                        if (moment(card.date).diff(moment(analysisCompleteDate), 'days') > 0) {
                            Trello.get('cards/' + card.data.card.id + '/list', function(singlelist) {
                                if (isActiveCol(singlelist)) {
                                    appendRowToTable(card.data.card.id, card.date,  $tableScope, "-", teamVelocity, card.data.card.name);
                                }
                            });
                        }
                    } else if(!isActiveCol(card.data.listBefore) && isActiveCol(card.data.listAfter)
                    && (moment(card.date).diff(moment(analysisCompleteDate), 'days') > 0)) {
                        appendRowToTable(card.data.card.id, card.date,  $tableScope, "+", teamVelocity, card.data.card.name);
                    } else if(isActiveCol(card.data.listBefore) && !isActiveCol(card.data.listAfter)
                    && (moment(card.date).diff(moment(analysisCompleteDate), 'days') > 0)) {
                        appendRowToTable(card.data.card.id, card.date, $tableScope, "-", teamVelocity, card.data.card.name);
                    }
                }
            });
        }
    });


    $tableScope.appendTo($scopeChange);

    return $scopeChange;
}

function appendRowToTable(id, date, $tableScope, weight, teamVelocity, name) {

    var row = $('<tr></tr>');

    $('<td>' + moment(date).format('L') + '</td>').addClass('confluenceTd').appendTo(row);
	var $columnName = $('<td></td>');
	var $columnScopeChange = $('<td></td>');


    $columnName.addClass('confluenceTd').appendTo(row);
    //calculate card points before date
	$columnScopeChange.addClass('confluenceTd').appendTo(row);

	Trello.get('cards/' + id + '/name', function (currentName) {
        $columnName.text(currentName._value);

		var storyUnits = 0;
        var match = currentName._value.match(/\[([SML])\]/);
        var size = 'U';
        if (match != null) { size = match[1];}
        switch (size) {
            case 'S':
                storyUnits += 1;
                break;
            case 'M':
                storyUnits += 2;
                break;
            case 'L':
                storyUnits += 4;
                break;
        }

		$columnScopeChange.text(weight + storyUnits / teamVelocity + ' day(s)');

    });

    //get reason from description
    Trello.get('cards/' + id + '/desc', function (desc) {
        $('<td>' + desc._value + '</td>').addClass('confluenceTd').appendTo(row);
    });
    row.appendTo($tableScope);
}


//************************************
// CFD related functions
//************************************

function drawCFD(boardId, targetElement) {
    $.when(getMetadata(boardId), getLists(boardId),getCardData(boardId))
        .done(function(metaDataResult, listResult, cardDataResult) {
            onInitComplete($.extend(metaDataResult, listResult, cardDataResult, { targetElement: targetElement }));
        });
}

function getLists(boardId) {
    var deferred = $.Deferred();
    Trello
        .get('boards/' + boardId + '/lists')
        .success(function(queryResult) {
            var state = {};
            // get list of list names
            state.listNames = $.map(queryResult, function(list, idx) {
                if(!isActiveCol(list))
                    return null;
                return list.name;
            });

            // get map of list id => list name
            state.listMap = {};
            $.each(queryResult, function(idx, list) {
                if(!isActiveCol(list))
                    return null;
                state.listMap[list.id] = list.name;
            });

            deferred.resolve(state);
        });
    return deferred;
}

function getCardData(boardId) {
    var deferred = $.Deferred();

    var params = {
        actions: 'createCard,copyCard,updateCard:idList,moveCardFromBoard,moveCardToBoard,updateCard:closed'
    };
    Trello
        .get('boards/'+ boardId + '/cards/all', params)
        .success(function(queryResult) {
            var state = {};
            state.cards = queryResult;

            state.cardActions = $.map(queryResult, function(card, idx) {
                return $.map(card.actions, function(cardAction, idxAction) {
                    if(cardAction.type === 'updateCard' && cardAction.data.listBefore) {
                        return { name: card.name, id: card.id, date: moment(cardAction.date), newColumn: cardAction.data.listAfter.id };
                    } else if (card.type === "createCard" || card.type === "copyCard" || card.type === "moveCardFromBoard" || card.type === "moveCardToBoard") {
                        return { name: card.name, id: card.id, date: moment(cardAction.date), newColumn: cardAction.data.list.id };
                    } else {
                        return null;
                    }
                });
            });

            deferred.resolve(state);
        });
    return deferred;
}

// Functions
function onInitComplete(state) {
    var meta = state.meta;
    var cards = state.cards;
    var cardActions = state.cardActions;
    var listNames = state.listNames;
    var listMap = state.listMap;
    var categories, series, dates;

    // data points
    //categories = $.map(cardActions, function(cardAction, idx) { return cardAction.date; });
    dates = buildDateSeries(meta.kickoffDate);
    categories = $.map(dates,
                    function(date, idx) {
                        return date.format('MM/DD/YYYY');
                    });

    var x = {};
    for(var i = 0; i < dates.length; i++) {
        var date = dates[i];
        for(var j = 0; j < cards.length; j++) {
            var card = cards[j];
            if(card.ignored)
                continue;
            var lastAction = getLastActionOfDay(card, date);

            if(!lastAction || !lastAction.newColumn || !listMap[lastAction.newColumn]) continue;

            if(lastAction.cardClosed) {
                card.ignored = true;
                continue;
            }

            if(!x[lastAction.newColumn]) {
                x[lastAction.newColumn] = $.map(new Array(dates.length), function() { return 0; });
            }
            var columnActions = x[lastAction.newColumn];
            columnActions[i] = columnActions[i] + 1;
        }
    }

    series = sortSeries(
        $.map(x, function(points, id) {
            return { name: listMap[id], data: points };
        })
    );

    doMagicChartOfDestiny(categories, series, state.targetElement);
}

function getCardStoryUnits(card) {
    var match = card.name.match(/\[([SML])\]/);
    if (match != null) {
        switch (match[1]) {
            case 'S':
                return 1;
            case 'M':
                return 2;
            case 'L':
                return 4;
        }
    }
};

function sortSeries(series) {
    var sorted = [];
    $.each(series, function (i, item) {
        if (item.name.indexOf('Analysis Complete') != -1) {
            sorted[0] = item;
        }
        else if (item.name.indexOf('Implementation') != -1) {
            sorted[1] = item;
        }
        else if (item.name.indexOf('Verification') != -1) {
            sorted[2] = item;
        }
        else if (item.name.indexOf('Release Ready') != -1) {
            sorted[3] = item;
        }
    });
    return sorted;
}

function isMatchingCardAction(cardAction) {
    return (cardAction.type === 'updateCard' && cardAction.data.listBefore)
        || (cardAction.type === 'createCard')
        || (cardAction.type === 'updateCard') && (cardAction.data.card && cardAction.data.card.closed) ;
}

function getLastActionOfDay(card, date) {
    var ret = null;
    var nextDay = date.clone().add(1, 'days');

    for(var i = card.actions.length - 1; i >= 0; i--) {
        var cardAction = card.actions[i];
        if(isMatchingCardAction(cardAction) && moment(cardAction.date) < nextDay) {
            ret = cardAction;
        } else {
            continue;
        }
    }

    if(!ret) return null;

    if(ret.type === 'updateCard' && ret.data.listAfter && isActiveCol(ret.data.listAfter)) {
        return { name: card.name, id: card.id, date: moment(ret.date), newColumn: ret.data.listAfter.id, cardClosed: (ret.data.card ? ret.data.card.closed : false) };
    } else if(ret.type === 'updateCard' && ret.data.card.closed) {
        return { name: card.name, id: card.id, date: moment(ret.date), newColumn: null, cardClosed: true };
    } else if (ret.type === 'createCard' && isActiveCol(ret.data.list)) {
        return { name: card.name, id: card.id, date: moment(ret.date), newColumn: ret.data.list.id, cardClosed: (ret.data.card ? ret.data.card.closed : false) };
    }
}

function doMagicChartOfDestiny(categories, series, targetElement) {
    var chart;
    chart = new Highcharts.Chart({
        colors: [
            '#DB843D',
            '#4572A7',
            '#80699B',
            '#89A54E'
        ],
        chart: {
            renderTo: targetElement,
            type: 'area'
        },
        title: {
            text: 'Tre-la-la CFD'
        },
        xAxis: {
            categories: categories,
            tickmarkPlacement: 'on',
            title: {
                enabled: false
            }
        },
        yAxis: {
            title: {
                text: 'Cards'
            }
        },
        tooltip: {
            formatter: function() {
                return ''+
                    this.x +': '+ this.y;
            }
        },
        plotOptions: {
            area: {
                stacking: 'normal',
                lineColor: '#666666',
                lineWidth: 0,
                marker: {
                    lineWidth: 1,
                    lineColor: '#666666'
                }
            }
        },
        series: series
    });
}

function buildDateSeries(startDate) {
    var series = [];
    var currentDate = startDate;
    var today = moment();
    while(currentDate < today) {
        series.push(currentDate);
        currentDate = currentDate.clone().add(1, 'day');
    }

    return series;
}

function getMetadata(boardId) {
    var deferred = $.Deferred();
    var kickoffDate, analysisCompleteDate, teamVelocity, releaseReadyDate, releasedOn;
    Trello
        .get('boards/' + boardId + '/lists?cards=open')
        .success(function(lists) {
            var analysisCompleteColId = null;

            $.each(lists, function(ix, list) {
                if (list.name.indexOf('Analysis Complete') != -1) {
                    analysisCompleteColId = list.id;
                }

                if (list.name.indexOf('Meta') != -1) {
                    $.each(list.cards, function(ix, card) {
                        var match = card.name.match(/^Confidence:\ (.*)$/);
                        if (match != null && match.length >= 2) {
                            confidence = match[1];
                        }

                        match = card.name.match(/^Kickoff\ Date:\ (.*)$/);
                        if (match != null && match.length >= 2) {
                            kickoffDate = match[1];
                        }

                        match = card.name.match(/^Analysis\ Complete\ Date:\ (.*)$/);
                        if (match != null && match.length >= 2) {
                            analysisCompleteDate = match[1];
                        }

                        match = card.name.match(/^Team\ Velocity\ \(Points\/Day\):\ (.*)$/);
                        if (match != null && match.length >= 2) {
                            teamVelocity = match[1];
                        }

                        match = card.name.match(/^Release\ Ready\ Date:\ (.*)$/);
                        if (match != null && match.length >= 2) {
                            releaseReadyDate = match[1];
                        }

                        match = card.name.match(/^Releases\ On:\ (.*)$/);
                        if (match != null && match.length >= 2) {
                            releasedOn = match[1];
                        }
                    });
                }
            });
            deferred.resolve({
                meta : {
                    kickoffDate: moment(kickoffDate),
                    analysisCompleteDate: moment(analysisCompleteDate),
                    teamVelocity: teamVelocity,
                    releaseReadyDate: moment(releaseReadyDate),
                    releasedOn: releasedOn
                }
            });
        });
    return deferred.promise();
}

//********************************************
// jQuery Plugins
//********************************************

$.fn.trelalaBoardSummary = function(boardId) {
    var $this = this;
    getBoardSummaryData(boardId).done(function(data) {
        completeId = $this.attr('id') + '-complete-' + boardId
        $this.html(
            '<table border=\'0\'>' +
            '<tr>' +
                '<td id=\'' + completeId + '\' rowspan=\'4\'></td> ' +
                '<td>Confidence: <b>' + data.confidence + '</b></td>' +
                '<td width=\'5px\'></td>' +
                '<td>Target date: <b>' + moment(data.projectedDoneDate).format("MM/DD/YYYY") + '</b></td> ' +
                '<td width=\'5px\'></td>' +
                '<td>Planned Story Units: <b>' + data.plannedStoryUnits + '</b></td> ' +
            '</tr>' +
            '<tr>' +
                '<td>Percent Complete (Actual): <b>' + data.percentCompleteLabel + '</b></td>' +
                '<td width=\'5px\'></td>' +
                '<td>Kickoff Date: <b>' + data.kickoffDate + '</b></td> ' +
                '<td width=\'5px\'></td>' +
                '<td>Revised Story Units: <b>' + data.currentStoryUnits + '</b></td> ' +
            '</tr>' +
            '<tr>' +
                '<td>&nbsp;</td>' +
                '<td width=\'5px\'></td>' +
                '<td>Release Ready Date: <b>' + data.releaseReadyDate + '</b></td> ' +
                '<td width=\'5px\'></td>' +
                '<td>Story Units Complete: <b>' + data.storyUnitsComplete + '</b></td> ' +
            '</tr>' +
            '<tr>' +
                '<td>&nbsp;</td>' +
                '<td width=\'5px\'></td>' +
                '<td>Released On: <b>' + data.releasedOn + '</b></td> ' +
            '</tr>' +
            '</table>'
            );
        createPercentageCompleteChart('#' + completeId, data.percentComplete, 100);
    });
    return this;
};

$.fn.trelalaBoardDashboardSummary = function(boardId) {
    var $this = this;
    getBoardSummaryData(boardId).done(function(data) {
        completeId = $this.attr('id') + '-complete-' + boardId
        $this.html(
            '<table><tr>' +
            '<td id=\'' + completeId + '\'></td> ' +
            '<td>' +
            '<div>Confidence: <b>' + data.confidence + '</b></div>' +
            '<div>Target date: <b>' + moment(data.projectedDoneDate).format("MM/DD/YYYY") + '</b></div>' +
            '</td>' +
            '</tr></table>'
            );
        createPercentageCompleteChart('#' + completeId, data.percentComplete, 100);
    });
    return this;
};

$.fn.trelalaBoardScopeChangeHistory = function(boardId) {
    this.html(getScopeChangeHistory(boardId));
    return this;
};