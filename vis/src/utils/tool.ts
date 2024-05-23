
export function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}


export function deepCopy(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    let copy;

    if (Array.isArray(obj)) {
        copy = [];
        for (let i = 0; i < obj.length; i++) {
            copy[i] = deepCopy(obj[i]);
        }
    } else {
        copy = {};
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                copy[key] = deepCopy(obj[key]);
            }
        }
    }

    return copy;
}

export function debounce(fn, delay = 1000){
    let timer: null|number = null;

    return function(){

        if(timer){
            clearTimeout(timer)
        }

        timer = setTimeout(() => {
            console.log('等了一会才执行');
            fn.call(this, arguments)
        }, delay)

    }
}