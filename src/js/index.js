const { Swappable, Plugins } = require('@shopify/draggable');
const fs = require('fs');
const remote = require('electron').remote;

var g_noteNextId = 0;
var g_tagNextId = 0;

var $g_contextBar = null;
var $g_tags_input = null;
var g_isContextBarVisible = false;
var g_isTagSelectorVisible = false;

var g_filePath = null;

var g_currentNoteId = -1;

class CNote {
    text = '';
    tags = [];//ids
}

class CNotesData {
    tagsMap = new Map();//tagid / name
    notes = new Map();//noteid / cnote
    order = [];//noteids
}

var g_notesData = new CNotesData();

function addTagToList(tag_name, tag_id) {
    $g_tags_input.before(
        `<div class="tags-section-tag" data-tag-id="${tag_id}">
                    <div class="tags-section-tag-name">                
                        ${tag_name}
                    </div>
                    <div class="tags-section-delete-tag">x</div>
                </div>`)


}

$(() => {
    let BrowserWindow = remote.getCurrentWindow();

    //BrowserWindow.toggleDevTools();

    $('#new-btn').click(() => {
        g_notesData = new CNotesData();
        g_noteNextId = 0
        g_tagNextId = 0;
        g_filePath = null;

        $('.notes-wrapper .block').remove();
        $('.right-area .tags-section-tag').remove();
    })

    $('#open-btn').click(() => {

        let filePaths =
            remote.dialog.showOpenDialogSync(
                BrowserWindow,
                {
                    properties: ['openFile'],
                    filters: [{ name: 'Notes File', extensions: ['json', 'pnf'] }]
                }
            );

        console.log(filePaths);

        if (filePaths === undefined) {
            return
        }
        else {
            g_filePath = filePaths[0]
        }

        fs.readFile(g_filePath, (err, data) => {
            if (err) throw err;

            let tempObj = JSON.parse(data.toString());

            g_notesData.tagsMap = new Map(tempObj.tagsMap);
            g_notesData.notes = new Map(tempObj.notes);
            g_notesData.order = tempObj.order;

            //render tags:
            for (var [tag_id, tag_name] of g_notesData.tagsMap) {
                addTagToList(tag_name, tag_id)
            }

            g_tagNextId = tag_id + 1;

            for (var [note_id, note_obj] of g_notesData.notes) {
                addNoteToList(note_id, note_obj)
            }

            g_noteNextId = note_id + 1;
        })
    });

    $('#save-btn').click(() => {

        if (g_filePath == null) {
            let saveFilePath =
                remote.dialog.showSaveDialogSync(
                    BrowserWindow,
                    {
                        properties: ['openFile'],
                        filters: [
                            { name: 'Notes File', extensions: ['pnf'] },
                            { name: 'Notes File JSON', extensions: ['json'] }
                        ]
                    }
                );

            if (saveFilePath === undefined) {
                //error no path
                return;
            }
            else {
                g_filePath = saveFilePath;
            }
        }

        //store file

        let tempObj = {
            tagsMap: Array.from(g_notesData.tagsMap.entries()),
            notes: Array.from(g_notesData.notes.entries()),
            order: g_notesData.order
        }

        fs.writeFileSync(g_filePath, JSON.stringify(tempObj));

        console.log('stored!');
    });



    $('#min-btn').click(() => {
        BrowserWindow.minimize();
    });

    $('#max-btn').click(() => {

        if (BrowserWindow.isMaximized()) {
            BrowserWindow.unmaximize();
        }
        else {
            BrowserWindow.maximize();
        }
    });

    $('#close-btn').click(() => {
        BrowserWindow.close();
    });

    let nw_selector = '.notes-wrapper';
    let nw = $(nw_selector);

    nw.append(`<div class="block-new" id="create-block">
                <div class="content">
                    + New note
                </div>
            </div>`);

    let cb = $('#create-block');

    cb.click(() => {
        cb.after(`
            <div class="block" data-note-id="${g_noteNextId}" tabindex="0">
                <div class="content-tags">
                    <div class="content-tag-add-btn">+</div>
                </div>
                <div class="content" contenteditable="true"></div>
            </div>`);

        g_notesData.notes.set(g_noteNextId, new CNote());

        g_noteNextId += 1;
    });

    $(document).on('focusin', '.block', e => {
        g_currentNoteId = $(e.currentTarget).data('note-id');
    })

    $(document).on('focusout', '.block', e => {
        //store data
        let note_obj = g_notesData.notes.get(g_currentNoteId);

        note_obj.text = $(e.currentTarget).children('.content').html();

        //g_currentNoteId = -1;

    })

    /*
        for (let i = 0; i < 15; i += 1) {
            nw.append(
                `<div class="block" data-id="${i}">
                        <div class="content" contenteditable="true">
                            Some ${i} text
                        </div>
                    </div>`
            );
        }
    */
    $g_contextBar = $('.context-bar');

    $(document).on('contextmenu', '.block', e => {
        if (!g_isContextBarVisible) {
            g_isContextBarVisible = true;
            $g_contextBar.css({ top: e.pageY, left: e.pageX, display: 'block' });
        }
        else {
            g_isContextBarVisible = false;
            $g_contextBar.css('display', 'none');
        }
    });

    $('.context-bar').click(() => {
        $(`[data-note-id=${g_currentNoteId}]`).remove();
        g_notesData.notes.delete(g_currentNoteId);

        //g_currentNoteId = -1;
    });

    $(document).click(() => {
        if (g_isContextBarVisible) {
            g_isContextBarVisible = false;
            $g_contextBar.css('display', 'none');
        }

        if (g_isTagSelectorVisible) {
            g_isTagSelectorVisible = false;
            $('.content-tag-add-btn').html('+')
        }
    });

    $(document).on('keydown', '.block', function (keyEvent) {

        //tab
        if (keyEvent.originalEvent.keyCode === 9) {
            keyEvent.preventDefault();

            let range = window.getSelection().getRangeAt(0);
            range.insertNode(document.createTextNode('\u00a0\u00a0\u00a0•\u00a0'));

            window.getSelection().collapseToEnd();
        }
    });


    $g_tags_input = $('#tags-input')

    $g_tags_input.on('keydown', keyEvent => {
        if (keyEvent.originalEvent.keyCode === 13 && $g_tags_input.val()) {
            keyEvent.preventDefault();

            let inputTag = $g_tags_input.val().trim().toLowerCase();

            if (!mapHasValue(g_notesData.tagsMap, inputTag)) {
                addTagToList(inputTag, g_tagNextId)

                g_notesData.tagsMap.set(g_tagNextId, inputTag);
                g_tagNextId += 1;
                $g_tags_input.val('')
            }
        }
    });

    $(document).on('click', '.tags-section-delete-tag', onTagDelete)

    $(document).on('click', '.content-tag-add-btn', (clickEvent) => {

        clickEvent.stopPropagation();

        let $add_tag_btn = $(clickEvent.currentTarget);

        let html_tags = '';

        let currentTags = g_notesData.notes.get(g_currentNoteId).tags;

        for (let [k, v] of g_notesData.tagsMap) {
            if (!currentTags.includes(k)) {
                html_tags += `<div class="content-tag-add-value" data-tag-id="${k}">${v}</div>`;
            }
        }

        if (html_tags !== '') {
            $add_tag_btn.html(html_tags);
            g_isTagSelectorVisible = true;
        }
    })

    $(document).on('focusout', '.content-tag-add-btn', e => {
        console.log(e.currentTarget);
    })

    $(document).on('click', '.content-tag-add-value', clickEvent => {
        clickEvent.stopPropagation();

        let $selected_tag_btn = $(clickEvent.currentTarget)
        let $add_tag_btn = $selected_tag_btn.parent();

        $add_tag_btn.html('+');

        $add_tag_btn.before(
            `<div class="content-tag" data-tag-id="${$selected_tag_btn.data('tag-id')}">
                        <div class="content-tag-name">${$selected_tag_btn.text()}</div>
                        <div class="content-tag-remove-btn">x</div>
                    </div>`
        )

        g_notesData.notes.get(g_currentNoteId).tags.push($selected_tag_btn.data('tag-id'))

    })

    $(document).on('click', '.content-tag-remove-btn', clickEvent => {
        let tagElement = $(clickEvent.currentTarget).parent()

        let tagIdToRemove = tagElement.data('tag-id');

        let tags = g_notesData.notes.get(g_currentNoteId).tags;

        for (let i = 0; i < tags.length; i += 1) {
            if (tags[i] == tagIdToRemove) {
                tags.splice(i, 1)
            }
        }

        tagElement.remove();
    })



    const swappable = new Swappable(document.querySelectorAll(nw_selector), {
        draggable: '.block',
        mirror: {
            appendTo: nw_selector,
            constrainDimensions: true,
        }
    });
})


const mapHasValue = (map, val) => {
    for (let [k, v] of map) {
        if (v === val) {
            return true;
        }
    }
    return false;
}

function onTagDelete(e) {
    let $tagElement = $(e.currentTarget).parent();

    let tagId = parseInt($tagElement.data('tag-id'));

    console.log(tagId)

    g_notesData.tagsMap.delete(tagId);

    //remove tag from notes
    for (let [, note] of g_notesData.notes) {
        let tags = note.tags;

        for (let i = 0; i < tags.length; i += 1) {
            if (tags[i] == tagId) {
                tags.splice(i, 1)
            }
        }
    }

    $tagElement.remove();

    renderNotes();
}

function renderNotes() {
    $('.notes-wrapper .block').remove();

    for (let [note_id, note_obj] of g_notesData.notes) {
        addNoteToList(note_id, note_obj)
    }
}


function addNoteToList(note_id, note_obj) {
    let tags_html = '';

    for (let tag of note_obj.tags) {
        tags_html += `<div class="content-tag" data-tag-id="${tag}">
                        <div class="content-tag-name">${g_notesData.tagsMap.get(tag)}</div>
                        <div class="content-tag-remove-btn">x</div>
                    </div>`
    }


    $('.notes-wrapper').append(`
            <div class="block" data-note-id="${note_id}" tabindex="0">
                <div class="content-tags">
                    ${tags_html}
                    <div class="content-tag-add-btn">+</div>
                </div>
                <div class="content" contenteditable="true">${note_obj.text}</div>
            </div>`)
}
