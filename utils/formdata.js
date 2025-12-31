const mimeMap = require('./mimeMap.js')

function FormData() {
    let fileManager = wx.getFileSystemManager();
    let data = {};
    let files = [];

    this.append = (name, value) => {
        data[name] = value;
        return true;
    }

    this.appendFile = (name, path, fileName) => {
        let buffer = fileManager.readFileSync(path);
        if (Object.prototype.toString.call(buffer).indexOf("ArrayBuffer") < 0) {
            return false;
        }
        files.push({
            name: name,
            buffer: buffer,
            fileName: fileName || getFileNameFromPath(path),
        });
        return true;
    }

    this.getData = () => {
        let boundary = "boundary--" + new Date().getTime();
        let contentType = "multipart/form-data; boundary=" + boundary;
        let buffer = new ArrayBuffer(0);

        // Add fields
        for (let name in data) {
            if (data.hasOwnProperty(name)) {
                const value = data[name];
                let str = "\r\n--" + boundary + "\r\n";
                str += "Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n";
                str += value;
                let newData = stringToArrayBuffer(str);
                buffer = u8Merg(buffer, newData);
            }
        }

        // Add files
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let str = "\r\n--" + boundary + "\r\n";
            str += "Content-Disposition: form-data; name=\"" + file.name + "\"; filename=\"" + file.fileName + "\"\r\n";
            str += "Content-Type: " + getMimeType(file.fileName) + "\r\n\r\n";
            let newData = stringToArrayBuffer(str);
            buffer = u8Merg(buffer, newData);
            buffer = u8Merg(buffer, file.buffer);
        }

        // End boundary
        let endData = stringToArrayBuffer("\r\n--" + boundary + "--\r\n");
        buffer = u8Merg(buffer, endData);

        return {
            contentType: contentType,
            buffer: buffer,
        }
    }
}

function getFileNameFromPath(path) {
    let idx = path.lastIndexOf("/");
    return path.substr(idx + 1);
}

function getMimeType(fileName) {
    let idx = fileName.lastIndexOf(".");
    let ext = fileName.substr(idx);
    return mimeMap.mimeMap[ext] || "application/octet-stream";
}

function stringToArrayBuffer(str) {
    let buffer = new ArrayBuffer(str.length);
    let view = new Uint8Array(buffer);
    for (let i = 0; i < str.length; i++) {
        view[i] = str.charCodeAt(i);
    }
    return buffer;
}

function u8Merg(buffer1, buffer2) {
    let tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
}

module.exports = FormData;
