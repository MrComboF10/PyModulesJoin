﻿'use strict';

const fs = require("fs");
const nodejspath = require("path");
const { dialog } = require("electron").remote;

var leftBlock = document.getElementById("left-block");
var fileList = document.getElementById("file-list");
var leftBottomBlock = document.getElementById("left-bottom-block");

var classesList = document.getElementById("classes-list");
var functionsList = document.getElementById("functions-list");
var importsList = document.getElementById("imports-list");

var classesCheckBoxList = document.getElementById("classes-checkbox-list");
var functionsCheckBoxList = document.getElementById("functions-checkbox-list");
var importsCheckBoxList = document.getElementById("imports-checkbox-list");

var deleteFile = document.getElementById("delete-file");
var newFile = document.getElementById("new-file");
var createModule = document.getElementById("create-module");

var dragElement;


class PythonObject {
    constructor(objectType, content, firstLine) {
        this._type = objectType;
        this._content = content;
        this._firstLine = firstLine;
        this._name = "";

        this._findName();
    }

    _findName() {
        switch (this._type) {
            case "class":
                if (this._firstLine.includes("(")) {
                    this._name = this._firstLine.substring(6, this._firstLine.indexOf("("));
                }
                else {
                    this._name = this._firstLine.substring(6, this._firstLine.indexOf(":"));
                }
                break;
            case "function":
                this._name = this._firstLine.substring(4, this._firstLine.indexOf("("));
                break;
            case "import":
                if (this._firstLine.includes("from")) {
                    this._name = this._firstLine.substring(5, this._firstLine.indexOf(" import"));
                }
                else if (this._firstLine.includes("as")) {
                    this._name = this._firstLine.substring(8, this._firstLine.indexOf(" as"));
                }
                else {
                    var firstLineTrim = this._firstLine.trim();
                    this._name = firstLineTrim.substring(7);
                }
        }
    }

    get name() {
        return this._name;
    }

    get content() {
        return this._content;
    }
}


class LeaningLeftContent {
    constructor(data) {
        this._data = data;
        this._lines = data.split(/[\r\n]+/g);
        this._linesLeaningLeftIndex = [];
        this._linesLeaningLeft = [];
        this._blocksLeaningLeft = [];
        this._classes = [];
        this._functions = [];
        this._imports = [];

        this._findLinesIndex();
        this._findLines();
        this._findBlocks();

        this._createClassesList();
        this._createFunctionsList();
        this._createImportsList();
    }

    // find leanigleft lines index
    _findLinesIndex() {
        for (var i = 0; i < this._lines.length; i++) {
            if (this._lines[i][0] != " " && this._lines[i][0] != "#" && this._lines[i] != "") {
                this._linesLeaningLeftIndex.push(i);
            }
        }
    }

    _findLines() {
        for (var lineIndex of this._linesLeaningLeftIndex) {
            this._linesLeaningLeft.push(this._lines[lineIndex]);
        }
    }

    _findBlocks() {
        var block = "";
        for (var i = 0; i < this._linesLeaningLeftIndex.length - 1; i++) {
            var block = "";
            for (var j = this._linesLeaningLeftIndex[i]; j < this._linesLeaningLeftIndex[i + 1]; j++) {
                block += this._lines[j] + "\r\n";
            }
            this._blocksLeaningLeft.push(block);
        }
        block = "";
        for (var i = this._linesLeaningLeftIndex[this._linesLeaningLeftIndex.length - 1]; i < this._lines.length; i++) {
            block += this._lines[i] + "\r\n";
        }

        this._blocksLeaningLeft.push(block);
    }

    _createClassesList() {
        for (var i = 0; i < this._linesLeaningLeft.length; i++) {
            if (/\bclass\b/g.test(this._linesLeaningLeft[i])) {
                var currentClass = new PythonObject("class", this._blocksLeaningLeft[i], this._linesLeaningLeft[i]);
                this._classes.push(currentClass);
            }
        }
    }

    _createFunctionsList() {
        for (var i = 0; i < this._linesLeaningLeft.length; i++) {
            if (/\bdef\b/g.test(this._linesLeaningLeft[i])) {
                var currentFunction = new PythonObject("function", this._blocksLeaningLeft[i], this._linesLeaningLeft[i]);
                this._functions.push(currentFunction);
            }
        }
    }

    _createImportsList() {
        for (var i = 0; i < this._linesLeaningLeft.length; i++) {
            if (/\bimport\b/g.test(this._linesLeaningLeft[i])) {
                var currentImport = new PythonObject("import", this._blocksLeaningLeft[i], this._linesLeaningLeft[i]);
                this._imports.push(currentImport);
            }
        }
    }

    _createPythonObjectsList(object, findNameRegex, objectList) {
        for (var i = 0; i < this._linesLeaningLeft.length; i++) {
            if (findNameRegex.test(this._linesLeaningLeft[i])) {
                var currentObject = new PythonObject(object, this._blocksLeaningLeft[i], this._linesLeaningLeft[i]);
                objectList.push(currentObject);
            }
        }
    }

    get linesLeaningLeft() {
        return this._linesLeaningLeft;
    }

    get blocksLeaningLeft() {
        return this._blocksLeaningLeft;
    }

    get classes() {
        return this._classes;
    }

    get functions() {
        return this._functions;
    }

    get imports() {
        return this._imports;
    }
}

// set high of fileList in functions of left block height
function setFileListHeight() {
    var leftBlockHeight = leftBlock.offsetHeight;
    var leftBottomBlockHeight = leftBottomBlock.offsetHeight;
    fileList.style.height = (leftBlockHeight - leftBottomBlockHeight).toString() + "px";
}

// create checkbox to use in pythonObjectList
function createPythonObjectLiCheckBox() {

    // create checkbox
    var divNodeCheckBox = document.createElement("div");
    divNodeCheckBox.classList.add("checkbox");
    divNodeCheckBox.isSelected = false;

    // add click event
    divNodeCheckBox.addEventListener("click", function () {

        // uncheck checkbox
        if (this.isSelected) {
            this.style.backgroundColor = "white";
            this.isSelected = false;
        }

        // check checkbox
        else {
            this.style.backgroundColor = "black";
            this.isSelected = true;
        }
    });

    return divNodeCheckBox;
}

function createPythonObjectHeaderCheckBox(pythonObjectsName, fileName) {

    var currentPythonObjectList = document.getElementById(pythonObjectsName + "-" + fileName);

    // create checkbox
    var divNodeCheckBox = document.createElement("div");
    divNodeCheckBox.classList.add("checkbox");
    divNodeCheckBox.setAttribute("id", pythonObjectsName + "-checkbox-" + fileName);
    divNodeCheckBox.isSelected = false;

    // add click event
    divNodeCheckBox.addEventListener("click", function () {

        // uncheck checkbox
        if (this.isSelected) {
            this.style.backgroundColor = "white";
            this.isSelected = false;

            for (let checkbox of currentPythonObjectList.getElementsByClassName("checkbox")) {
                checkbox.isSelected = false;
                checkbox.style.backgroundColor = "white";
            }
        }

        // check checkbox
        else {
            this.style.backgroundColor = "black";
            this.isSelected = true;

            for (let checkbox of currentPythonObjectList.getElementsByClassName("checkbox")) {
                checkbox.isSelected = true;
                checkbox.style.backgroundColor = "black";
            }
        }
    });

    return divNodeCheckBox;
}

// create pythonObjectLi for each object find in file
function createPythonObjectLi(pythonObject) {
    var textNodeObjectName = document.createTextNode(pythonObject.name);

    // create div with object name
    var divNodeObjectName = document.createElement("div");
    divNodeObjectName.appendChild(textNodeObjectName);

    // create checkbox
    var divNodeObjectCheckBox = createPythonObjectLiCheckBox();

    // create pythonObjectLi
    var divNodeObject = document.createElement("div");
    divNodeObject.appendChild(divNodeObjectName);
    divNodeObject.appendChild(divNodeObjectCheckBox);

    divNodeObject.name = pythonObject.name;
    divNodeObject.content = pythonObject.content;

    return divNodeObject;
}

// create class, function or import list for specific file (ex: id="classes-"+fileName)
function createPythonObjectList(pythonObjectId, pythonObjectList) {

    // create pythonObjectList
    var divNodeObjectsList = document.createElement("div");
    divNodeObjectsList.setAttribute("id", pythonObjectId);
    divNodeObjectsList.style.display = "none";

    for (var pythonObject of pythonObjectList) {

        // create pythonObjectLi for each object from pythonObjectList
        var divNodeClass = createPythonObjectLi(pythonObject);
        divNodeObjectsList.appendChild(divNodeClass);
    }

    return divNodeObjectsList;
}

// create new li in fileList with name fileName
function createLiNodeFileList(fileName, leaningLeftContent) {
    var filenameTextNode = document.createTextNode(fileName);
    var liNodeFileList = document.createElement("li");
    liNodeFileList.appendChild(filenameTextNode);

    liNodeFileList.setAttribute("draggable", "true");

    // store leaningLeftContent
    liNodeFileList.leaningLeftContent = leaningLeftContent;

    // store li file name
    liNodeFileList.fileName = fileName;

    liNodeFileList.isSelected = false;

    // click event
    liNodeFileList.addEventListener("click", function () {

        // hide all li classes, functions and imports of all li in fileList which are selected
        for (var li of fileList.getElementsByTagName("li")) {
            if (li.isSelected) {
                let fileName = li.fileName;
                hidePythonObjectsLists(fileName);
                li.isSelected = false;
                li.style.backgroundColor = "aqua";
            }
        }

        // add liNodeFileList propertie to verify if element is selected
        this.isSelected = true;

        var fileName = this.fileName;

        // show all li classes, functions and imports of fileName
        showPythonObjectsLists(fileName);

        this.isSelected = true;
        this.style.backgroundColor = "yellow";
    });

    liNodeFileList.addEventListener("dragstart", function (e) {
        dragElement = this;
    });

    liNodeFileList.addEventListener("dragover", function (e) {
        e.preventDefault();
    });

    liNodeFileList.addEventListener("drop", function (e) {
        e.stopPropagation();

        for (let file of e.dataTransfer.files) {

            let data = fs.readFileSync(file.path, "utf8");
            processFileData(file.name, data);
        }

        if (this != dragElement && e.dataTransfer.items.length == 0) {
            this.parentElement.removeChild(dragElement);
            this.parentElement.insertBefore(dragElement, this);
        }
    });

    return liNodeFileList;
}

function processFileData(fileName, data) {

    // verify if file name already exists
    for (let f of fileList.childNodes) {

        if (f.textContent == fileName) {
            let button_index = dialog.showMessageBoxSync({
                type: "warning",
                buttons: ["Yes", "No"],
                defaultId: 0,
                title: "File already exists!",
                message: "Do you want to replace it?"
            });

            if (button_index == 0) {

                // remove previous python object lists
                removePythonObjectsFileList(fileName);

                // remove li from filelist
                fileList.removeChild(f);
            }
            else return;
        }
    }

    var leaningLeftContent = new LeaningLeftContent(data);

    var liNodeFileList = createLiNodeFileList(fileName, leaningLeftContent);
    fileList.appendChild(liNodeFileList);

    var divNodeClassesList = createPythonObjectList("classes-" + fileName, leaningLeftContent.classes);
    classesList.appendChild(divNodeClassesList);

    var divNodeFunctionsList = createPythonObjectList("functions-" + fileName, leaningLeftContent.functions);
    functionsList.appendChild(divNodeFunctionsList);

    var divNodeImportsList = createPythonObjectList("imports-" + fileName, leaningLeftContent.imports);
    importsList.appendChild(divNodeImportsList);



    var divNodeClassCheckBox = createPythonObjectHeaderCheckBox("classes", fileName);
    divNodeClassCheckBox.style.display = "none";
    classesCheckBoxList.appendChild(divNodeClassCheckBox);

    var divNodeFunctionCheckBox = createPythonObjectHeaderCheckBox("functions", fileName);
    divNodeFunctionCheckBox.style.display = "none";
    functionsCheckBoxList.appendChild(divNodeFunctionCheckBox);

    var divNodeImportCheckBox = createPythonObjectHeaderCheckBox("imports", fileName);
    divNodeImportCheckBox.style.display = "none";
    importsCheckBoxList.appendChild(divNodeImportCheckBox);
}

// hide or show fileName classes, functions and imports
function styleDisplayPythonObjectsLists(fileName, styleDisplay) {
    var pythonObjectClassesList = document.getElementById("classes-" + fileName);
    pythonObjectClassesList.style.display = styleDisplay;

    var pythonObjectFunctionsList = document.getElementById("functions-" + fileName);
    pythonObjectFunctionsList.style.display = styleDisplay;

    var pythonObjectImportsList = document.getElementById("imports-" + fileName);
    pythonObjectImportsList.style.display = styleDisplay;

    var pythonObjectClassesCheckBoxList = document.getElementById("classes-checkbox-" + fileName);
    pythonObjectClassesCheckBoxList.style.display = styleDisplay;

    var pythonObjectFunctionsCheckBoxList = document.getElementById("functions-checkbox-" + fileName);
    pythonObjectFunctionsCheckBoxList.style.display = styleDisplay;

    var pythonObjectImportCheckBoxList = document.getElementById("imports-checkbox-" + fileName);
    pythonObjectImportCheckBoxList.style.display = styleDisplay;
}

// hide all fileName classes, functions and imports
function hidePythonObjectsLists(fileName) {
    styleDisplayPythonObjectsLists(fileName, "none");
}

// show all fileName classes, functions and imports
function showPythonObjectsLists(fileName) {
    styleDisplayPythonObjectsLists(fileName, "block");
}

// remove all classes, functions and imports of fileName from classesList, functionsList and importsList
function removePythonObjectsFileList(fileName) {

    // remove all classes of fileName from classesList
    var pythonObjectClassesFile = document.getElementById("classes-" + fileName);
    classesList.removeChild(pythonObjectClassesFile);

    // remove all functions of fileName from functionsList
    var pythonObjectFunctionsFile = document.getElementById("functions-" + fileName);
    functionsList.removeChild(pythonObjectFunctionsFile);

    // remove all imports of fileName from importsList
    var pythonObjectImportsFile = document.getElementById("imports-" + fileName);
    importsList.removeChild(pythonObjectImportsFile);

    // remove classes checkbox of fileName
    var pythonObjectClassesCheckBox = document.getElementById("classes-checkbox-" + fileName);
    classesCheckBoxList.removeChild(pythonObjectClassesCheckBox);

    // remove functions checkbox of fileName
    var pythonObjectFunctionsCheckBox = document.getElementById("functions-checkbox-" + fileName);
    functionsCheckBoxList.removeChild(pythonObjectFunctionsCheckBox);

    // remove imports checkbox of fileName
    var pythonObjectImportsCheckBox = document.getElementById("imports-checkbox-" + fileName);
    importsCheckBoxList.removeChild(pythonObjectImportsCheckBox);
}

function getSelectedPythonObject(pythonObjectsId) {
    let pythonObjectsList = [];
    let pythonObjects = document.getElementById(pythonObjectsId);
    for (let pyobj of pythonObjects.childNodes) {
        for (let childsObj of pyobj.childNodes) {
            if (childsObj.className == "checkbox") {
                if (childsObj.isSelected) pythonObjectsList.push(pyobj);
            }
        }
    }
    return pythonObjectsList;
}

function getPythonObjectStringContent(pythonObjectsId) {
    let content = "";
    for (let pyobj of getSelectedPythonObject(pythonObjectsId)) {
        content += pyobj.content;
    }
    return content;
}

function getPythonObjectStringNameList(pythonObjectsId) {
    let namesList = [];
    for (let pyobj of getSelectedPythonObject(pythonObjectsId)) {
        namesList.push(pyobj.name);
    }
    return namesList;
}

function existCheckedDuplicates(namesList) {
    return (new Set(namesList)).size !== namesList.length;
}



window.addEventListener("resize", function () { setFileListHeight() });

fileList.addEventListener("dragover", function (e) {
    e.preventDefault();
});

fileList.addEventListener("dragleave", function (e) {
    e.preventDefault();
});

fileList.addEventListener("drop", function (e) {
    e.preventDefault();

    for (let file of e.dataTransfer.files) {

        let data = fs.readFileSync(file.path, "utf8");
        processFileData(file.name, data);
    }

    if (e.dataTransfer.items.length == 0) {
        this.removeChild(dragElement);
        this.appendChild(dragElement);
    }
});

deleteFile.addEventListener("click", function () {
    for (let liIndex = 0; liIndex < fileList.childNodes.length; liIndex++) {
        if (fileList.childNodes[liIndex].isSelected) {

            // remove all python objects lists
            removePythonObjectsFileList(fileList.childNodes[liIndex].fileName);

            // remove li from filelist
            fileList.removeChild(fileList.childNodes[liIndex]);
        }
    }
});

// open file explorer to select files
newFile.addEventListener("click", function () {

    var files_path = dialog.showOpenDialogSync({
        properties: ["openFile", "multiSelections"]
    });

    for (let path of files_path) {

        let file_data = fs.readFileSync(path, "utf8");
        let file_name = nodejspath.basename(path);
        processFileData(file_name, file_data);
    }
});

createModule.addEventListener("click", function () {

    // check duplicates
    var classesNamesList = [];
    var functionsNamesList = [];
    var importsNamesList = [];

    for (let li of fileList.childNodes) {
        classesNamesList = classesNamesList.concat(getPythonObjectStringNameList("classes-" + li.fileName));
        functionsNamesList = functionsNamesList.concat(getPythonObjectStringNameList("functions-" + li.fileName));
        importsNamesList = importsNamesList.concat(getPythonObjectStringNameList("imports-" + li.fileName));

    }

    var existClassesDuplicates = existCheckedDuplicates(classesNamesList);
    var existFunctionsDuplicates = existCheckedDuplicates(functionsNamesList);
    var existImportsDuplicates = existCheckedDuplicates(importsNamesList);

    if (existClassesDuplicates || existFunctionsDuplicates || existImportsDuplicates) {
        let warningString = "There are multiple ";

        if (existClassesDuplicates) {
            warningString += "classes";
        }

        if (existFunctionsDuplicates) {
            if (existClassesDuplicates) warningString += ", ";
            warningString += "functions";
        }

        if (existImportsDuplicates) {
            if (existFunctionsDuplicates || existClassesDuplicates) warningString += ", ";
            warningString += "imports";
        }

        warningString += " with the same name selected. Do you want to continue?";

        let buttonIndex = dialog.showMessageBoxSync({
            type: "warning",
            buttons: ["Yes", "No"],
            defaultId: 0,
            title: "File already exists!",
            message: warningString
        });

        if (buttonIndex == 1) return;

    }

    var directory_path = dialog.showSaveDialogSync({
        filters: [{ name: "Python File", extensions: ["py"]}]
    });

    if (directory_path !== undefined) {

        let importsContent = "";
        let functionsContent = "";
        let classesContent = "";
        let finalContent;

        for (let li of fileList.childNodes) {
            classesContent += getPythonObjectStringContent("classes-" + li.fileName);
            functionsContent += getPythonObjectStringContent("functions-" + li.fileName);
            importsContent += getPythonObjectStringContent("imports-" + li.fileName);
        }

        finalContent = importsContent + functionsContent + classesContent;

        fs.writeFileSync(directory_path, finalContent);
    }
});

setFileListHeight();
