/**
 * @title   clone.js - The true prototype-based OOP framework.
 * @version 0.6.0 alpha
 * @author  Alex Shvets
 * @see     <a href="http://quadronet.mk.ua/clonejs/">Documentation</a>
 * @see     <a href="http://github.com/quadroid/clonejs/">GitHub</a>
 *
 * @class
 *     This is the framework that implements the true prototype-based OOP paradigm in JS.<br>
 *     It's based on the new ECMA Script 5 features like Object.create and property descriptors.
 *
 *     <p><a href="http://github.com/quadroid/clonejs">Project on GitHub</a>
 *
 *     <p><b>Naming conventions</b>
 *     <p>Var names, prefixed by "<b>$</b>", contain object, used as prototype for other objects. For example:<br>
 *        var $array = Array.prototype, $myType = {}, <br>
 *            myTypeInstance = Clone($myType);
 *     <p>Properties, prefixed by "<b>_</b>", are private.
 *     <p>
 * @description
 *     With this library you should forget about classes. Use prototypes instead.
 *
 * @example
 *     var $myType = $object.clone({
 *         '(final)  notConfigurableAndNotWritable': true,
 *         '(writable final)   notConfigurableOnly': null,
 *         '(hidden final get) notEnumerableGetter': function(){},
 *         '(hidden)                 notEnumerable': true,
 *         '(const)                       constant': 'not writable',
 *                                  publicProperty : 1,
 *                                           _item : null,// private property (not enumerable)
 *                                     '(get) item': function() { return this._item },
 *                                     '(set) item': function(v){ this._item = v },
 *                      '(get) publicPropertyAlias': 'publicProperty',// automatically create getter for publicProperty
 *                                     constructor : function MyType(){
 *                                                       var obj = this.applySuper(arguments);
 *                                                       // do something with obj...
 *                                                       return obj;
 *                                                   }
 *     });
 *     var myTypeInstance = $myType.create({publicProperty: 2});
 *     assert( $myType.isPrototypeOf(myTypeInstance) );
 *     assert( $myType.publicPropertyAlias === $myType.publicProperty );
 *
 *     var $myArray1 = $object.clone.call(Array.prototype, {customMethod: function(){}});
 *     var $myArray2 = Clone.makeFom(Array, {customMethod: function(){}});
 *
 *     var myObj = {a:1, b:2, c:3};
 *     var cloneOfMyObj = $object.clone.call(myObj);
 *     cloneOfMyObj.a = 11; // myObj.a still == 1
 */
var $object = /** @lands $object# */{

    /**
     * Create a clone of object. See <a href="http://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/create">Object.create</a> for details.
     * @see <a href="http://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/create">Object.create</a>
     * @returns {$object}
     * @memberof $object#
     */
    clone: function(/** Object= */properties, /** PropertyDescriptor= */defaultDescriptor){
        if(arguments.length){
            var descriptors = $object.describe.apply(null, arguments);

            if( descriptors.hasOwnProperty('constructor') ){
                var constructor = descriptors.constructor.value;
                if(typeof constructor == 'string'){
                    descriptors.constructor.value = function CustomType(){
                        return this._applySuper(arguments);
                    }
                }
                descriptors.constructor.value.prototype = this;
            }
        }
        return Object.create(this, descriptors);
    },

    /**
     * Use this method to create an instances of prototype objects.
     * <p>Behaves like a clone method. But, also apply constructor, and the created instance will be sealed (<a href="http://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/seal">Object.seal</a>): to prevent it, override the constructor.
     * @see $object#clone
     * @see <a href="http://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/seal">Object.seal</a>
     * @returns {$object}
     *
     * @example
     *     var $myType = $object.clone({
     *         create: 'MyType',
     *     });
     *     var myTypeInstance = $myType.create();
     *     assert( myTypeInstance.constructor === $myType.constructor );
     *     assert( $myType.isPrototypeOf(myTypeInstance) );
     *
     * @memberOf $object#
     */
    create: function(/** Object= */properties, /** PropertyDescriptor= */defaultDescriptor){
        var obj = this.clone();
        return obj.constructor.apply(obj, arguments) || obj;
    },


    /**
     * Default constructor. Override it if you want to create custom type.
     * @field
     * @memberOf $object#
     */
    constructor: function CloneObject(/** Object= */properties, /** PropertyDescriptor= */defaultDescriptor){
        properties && this.defineProperties(properties, defaultDescriptor);

        if( this.constructor === CloneObject ){
            this.seal();
        }
    },

    /**
     * Translate object to property descriptors.
     * <p>For example, {a:{}, b:2} will be translated to something like {a: {value: {}}, b: {value: 2}}.
     * <p>Functions (except getters) and properties prefixed by "_" will be automatically marked as non-enumerable.
     * <p>You can prefix your property names by (get|set|const|final|hidden|writable).
     *     <li>(get) - define getter, if string passed, the getter will be auto generated.
     *     <li>(set) - define setter, if string passed, the setter will be auto generated.
     *     <li>(const) - make property unwritable.
     *     <li>(final) - make property unwritable, and prevent it deleting and descriptor modifications.
     *     <li>(hidden) - make property non-enumerable.
     *     <li>(writable) - make property writable (use with final).
     *
     * @param {Object} properties
     * @param {PropertyDescriptor=} defaultDescriptor The default property descriptor.
     * @returns {{PropertyDescriptor}} Property descriptors.
     *
     * @static
     * @memberOf $object
     */
    describe: function(properties, defaultDescriptor){
        var descriptors = {};

        var $defaultDescriptor = defaultDescriptor ? defaultDescriptor : {
            configurable: true,
            enumerable: true,
            writable: true
        };

        var hidingAllowed = !(defaultDescriptor && defaultDescriptor.enumerable);

        for(var name in properties){
            var value = properties[name];
            var descriptor = Object.create($defaultDescriptor);

            if( name[0]=='(' ){
                //TODO: fix regexp to not mach the '(getset) property'
                var matches = name.match(/^\((((get|set|const|hidden|final|writable) *)+)\) +(.+)$/);
                if( matches ){
                    var prefixes = matches[1].split(' ').sort();
                    name = matches[4];

                    if(descriptors[name]) descriptor = descriptors[name];

                    for(var i in prefixes) switch(prefixes[i]){
                        case    'const': descriptor.writable     = false; break;
                        case    'final': descriptor.configurable = false; descriptor.writable = false; break;
                        case      'get': descriptor.get          = value; break;
                        case   'hidden': descriptor.enumerable   = false; break;
                        case      'set': descriptor.set          = value; break;
                        case 'writable': descriptor.writable     = true;  break;
                    }
                }
            }

            if(descriptor.get || descriptor.set){
                if(typeof value == 'string'){
                    var hiddenPropertyName = value;
                    if(typeof descriptor.get == 'string'){
                        descriptor.get = function getter(){
                            return this[hiddenPropertyName];
                        }
                    }else{
                        descriptor.set = function setter(newValue){
                            this[hiddenPropertyName] = newValue;
                        }
                    }
                }
                descriptor.value = undefined;
                if(descriptor.get) value = undefined;// do not allow to hide getter by default
            }else{
                descriptor.value = value;
            }

            // hide methods and private properties:
            if(hidingAllowed && typeof(value)=='function' || name[0]=='_'){
                descriptor.enumerable = false;
            }
    //        // constants:
    //        if(name.toUpperCase() == name){
    //            descriptor.writable = false;
    //        }
            descriptors[name] = descriptor;
        }
    //    if( descriptors.hasOwnProperty('constructor')){
    //        descriptors.constructor.enumerable = false;
    //    }
        return descriptors;
    },
    
    /**
     * Apply method of super object (prototype) to this object.
     * @returns {*}
     * @see $object#__super__
     * @see $object#_callSuper
     * @memberof $object#
     */
    _applySuper: function(/** string='constructor'|Array */ methodName, /** Array= */args){
        if(typeof(methodName) != 'string'){
            if( arguments[0] instanceof Array){
                args = arguments[0];
            }
            methodName = 'constructor';
        }//</arguments>

        /* if not */('__super__' in this) || this.defineProperty(
            '__super__', {value: Object.getPrototypeOf(Object.getPrototypeOf(this)), writable:!0,configurable:!0}
            /**
             * Link to the object prototype.
             * Dynamically changed to next by prototype chain, while _applySuper method executing.
             * System property. <b>Use it only for debug purposes</b>.
             * @name  __super__
             * @type  {?Object}
             * @see $object#_applySuper
             * @memberOf $object#
             */
        );

        // save super
        var savedSuper = this.__super__;
        // set super to next by prototype chain, in case if method also call _applySuper
        this.__super__ = Object.getPrototypeOf(savedSuper);
        // apply method
        var returned   = savedSuper[methodName].apply(this, args);
        // restore super
        this.__super__ = savedSuper;

        return returned;
    },

    /** @see $object#_applySuper
     *  @see $object#__super__
     *  @memberof $object# */
    _callSuper: function(/** string */methodName, /** ?= */ arg1, /** ...?= */argN){
        var args = Array.prototype.slice.call(arguments, 1);
        return this._applySuper(methodName, args);
    },

//        /**
//         * Async safe version of {@link $object#_applySuper}.
//         * @param {string} methodName
//         * @param {Array} args
//         * @param {...number=} callbackArgIdx1 Indexes of arguments, that is a callbacks, that can call _applySuper.
//         *     Default value is the last arg index.
//         * @param callbackArgIdxN
//         * @returns {*}
//         */
//        applySuperAsync: function(methodName, args, /** number=`args.length-1` */callbackArgIdx1, /** number= */callbackArgIdxN){
//            if( callbackArgIdx1===undefined)
//                callbackArgIdx1 = args.length - 1;
//
//            var safeArgs = new Array(args.length);
//            var indexOf = Array.prototype.indexOf;
//            for(var i=0; i < args; i++){
//                safeArgs[i] = indexOf.call(arguments, i, 2+i) ? this.createSuperSafeCallback(args[i]) : args[i];
//            }
//
//            return this._applySuper(methodName, safeArgs);
//        },

    /**
     * Use this method to wrap callback, that can call "_applySuper" method.
     * @see $object#_applySuper
     * @returns {Function}
     * @memberof $object#
     */
    createSuperSafeCallback: function(/** Function|string */functionOrMethodName, /** Object= */boundThis){
        if(typeof functionOrMethodName == 'string'){
            var fn = this[functionOrMethodName];
            if(typeof boundThis == 'undefined') boundThis = this;
        }else{
            fn = functionOrMethodName;
        }
        //</arguments>

        var self = this;
        var callbackSuper = this.__super__;

        return function superSafeCallback(){

            if(self.__super__ === callbackSuper){
                return fn.apply(boundThis||this, arguments);

            }else{
                var savedSuper = self.__super__;
                self.__super__ = callbackSuper;
                var returned   = fn.apply(boundThis||this, arguments);
                self.__super__ = savedSuper;

                return returned;
            }
        }
    },

    /**
     * Returns all changed properties, since cloning of object.<br>
     * Separate object from its prototype and return it.<br>
     * Private meens non-enumerable properties.
     * @returns {$object}
     * @memberof $object#
     */
    getState: function(/** boolean=false */listPrivate){
        var currentState  = $object.create();
        var ownProperties = listPrivate ? Object.getOwnPropertyNames(this) : Object.keys(this);

        for(var i=0; i < ownProperties.length; i++){var name = ownProperties[i];
            currentState[name] = this[name];
        }

        return currentState;
    },

    /**
     * Mix two or more objects.
     *
     * @param objectToMix
     *        Object(s) to mix. If it is FunctionType, FunctionType.prototype will be used instead.
     *
     * @param parentsLevel
     *        Set this to Infinity if you want to copy all objectToMix parents properties up to Object.prototype.
     *
     * @param copyNesting
     *        Should be true if objectsToMix have methods, that call {@link $object#applySuper}
     *        If not true, all own properties of all objects will be directly attached to the one root object.
     *
     * @returns {Object} Modified root object if copyNesting, else - the new object based on objectsToMix copies and root.
     * @memberOf $object#
     */
    mix: function(
        /** Object|FunctionType|Array.<(Object|FunctionType)> */
        objectToMix,
        /**            number=0 */parentsLevel,
        /**        boolean=true */copyNesting
    ){
//        if( typeof(this)=='function' && Object.getOwnPropertyNames(this.prototype) ){
//            this = this.prototype;
//        }
        if( copyNesting === undefined ){
            if(typeof parentsLevel == 'boolean'){
                copyNesting   = parentsLevel;
                parentsLevel  = 0;
            }else copyNesting = true;
        }

        if(objectToMix instanceof Array){
            mixedObjects = objectToMix;
        }else{
            // get parents:
            var obj = objectToMix;
            var mixedObjects = [];
            do  mixedObjects.push(obj);
            while( parentsLevel-- && (obj = Object.getPrototypeOf(obj)) != Object.prototype);
        }

        mixedObjects = mixedObjects.reverse();

        var updateObj = this;

        for(var objIdx in mixedObjects){
            obj = mixedObjects[objIdx];

            if( typeof(obj)=='function' && Object.getOwnPropertyNames(obj.prototype) ){
                obj = obj.prototype;
            }

            var ownPropertyNames = Object.getOwnPropertyNames(obj);

            if(copyNesting && ownPropertyNames.length){
                updateObj = $object.clone.call(updateObj);
            }

            // copy all own properties from obj to updateObj:
            for(var i=0; i < ownPropertyNames.length; i++){
                var name = ownPropertyNames[i];
                var descriptor = Object.getOwnPropertyDescriptor(obj, name);
                Object.defineProperty(updateObj, name, descriptor);
            }
        }

        return updateObj;
    },


//    /**
//     * Apply method from one object to another object.
//     * @example
//     *     var array = $object.do('mix', Array.prototype);
//     *     var  args = $object.do.call(Array, 'slice',[1], arguments);
//     * @returns {*}
//     */
//    do: function(/** string */methodName, /** Array */args, /** Object */withObj, asObj){
//        if(arguments.length == 2){
//            withObj = args;
//            args = undefined;
//        }
//        if(!asObj){
//            asObj = this;
//
//        }else if( asObj.prototype && typeof asObj == 'function' ){
//            asObj = asObj.prototype;
//        }
//
//        return asObj[methodName].apply(withObj, args);
//    },

    /**
     * Use this to check if method of one object is the same as in the another object.
     * @example
     *     var myObj1 = $object.clone({join: function(sep){} });
     *     var myObj2 = $object.clone({join: function(){}    });
     *     assert( myObj1.can('split').like( Array.prototype ) === true  );
     *     assert( myObj2.can('split').like( Array.prototype ) === false );
     *     assert( myObj1.can('split').as(   Array.prototype ) === false );
     *     assert( $object.can.call(new Array, 'split').as(new Array) === true  );
     *
     * @returns {{like: function(Object):boolean, as: function(Object):boolean}}
     * @memberOf $object#
     */
    can: function(/** string */method, /** number=false */not){
        var obj1 = this;
        return {
            /** @ignore *///jsdoc3
            valueOf: function(){
                // a ^ b == a ? !b : b
                return not ^ typeof( obj1[method] )=='function';
            },

            like: function(obj2){
                var obj2Method = obj2[method];
                return this.valueOf()
                    && not ^ (
                    typeof(obj2Method)=='function' &&
                        obj2Method.length == obj1[method].length
                    );
            },

            as: function(obj2){
                return this.valueOf()
                    && not ^ obj1[method] === obj2[method];
            }
        }
    },

    /**
     * @see $object#can
     * @memberof $object# */
    cant: function(/** string */method){
        return this.can(method, 1);
    },

    /**
     * Returns the current state of this object in JSON format.
     * @see $object#getState
     * @memberof $object# */
    toString: function(){
        return JSON.stringify( this.getState() );
    },

//        /**
//         * Returns true if all enumerable properties of this present in obj.
//         * @returns {boolean}
//         */
//        looksLike: function(/** Object */obj){
//            for(var  p in this){
//                if(!(p in obj))
//                    return false;
//            }
//            return true;
//        },
//        /**
//         * Returns true if all methods of this present in obj.
//         * @returns {boolean}
//         */
//        behavesLike: function(/** Object */obj){
//            var propertyNames = this.getOwnPropertyNames();
//            for(var i= 0; i < propertyNames.length; i++){var name = propertyNames[i];
//                if(name[0]!=='_'){
//                    var property = this[name];
//                    if(typeof(property)=='function'){
//                        var objProperty = obj[name];
//
//                        if(typeof(objProperty)!='function') return false;
//                        if(objProperty.length != property.length) return false;
//                    }
//                }
//            }
//            return true;
//        },

    // Some sugar:

    /** @see <a href="http://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/getPrototypeOf">Object.getPrototypeOf</a>
     * @memberof $object# */
    getPrototype: function(){
        return Object.getPrototypeOf(this) },
    /** @see <a href="http://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/keys">Object.keys</a>
     * @memberof $object# */
    getEnumerableOwnPropertyNames: function(){
        return Object.keys(this) },
    /** @see <a href="http://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/getOwnPropertyNames">Object.getOwnPropertyNames</a>
     * @memberof $object# */
    getOwnPropertyNames: function(){
        return Object.getOwnPropertyNames(this) },

    /** @see <a href="http://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/preventExtensions">Object.preventExtensions</a>
     * @memberof $object# */
    preventExtensions: function(){
        return Object.preventExtensions(this) },
    /** @see <a href="http://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/isExtensible">Object.isExtensible</a>
     * @memberof $object# */
    isExtensible: function(){
        return Object.isExtensible(this) },
    /** @see <a href="http://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/seal">Object.seal</a>
     * @memberof $object# */
    seal: function(){
        return Object.seal(this) },
    /** @see <a href="http://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/isSealed">Object.isSealed</a>
     * @memberof $object# */
    isSealed: function(){
        return Object.isSealed(this) },
    /** @see <a href="http://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/freeze">Object.freeze</a>
     * @memberof $object# */
    freeze: function(){
        return Object.freeze(this) },
    /** @see <a href="http://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/isFrozen">Object.isFrozen</a>
     * @memberof $object# */
    isFrozen: function(){
        return Object.isFrozen(this) },

    /** @see <a href="http://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/getOwnPropertyDescriptor">Object.getOwnPropertyDescriptor</a>
     * @memberof $object# */
    getOwnPropertyDescriptor: function(/** string */ name){
        return Object.getOwnPropertyDescriptor(this, name);
    },

    /** @see <a href="http://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/defineProperties">Object.defineProperties</a>
     *  @see $object.describe
     *  @memberof $object# */
    defineProperties: function(/** Object= */properties, /** PropertyDescriptor= */defaultDescriptor){
        return Object.defineProperties(this, $object.describe.apply(null, arguments));
    },

    /** @see <a href="http://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/defineProperty">Object.defineProperty</a>
     *  @memberof $object# */
    defineProperty: function(/** string */name, /** PropertyDescriptor */propertyDescriptor){
        return Object.defineProperty(this, name, propertyDescriptor);
    }

//    descriptor: {
//        get configurable(){return Object.isExtensible(this)},
//        set configurable(preventExtensions){ if(preventExtensions) Object.preventExtensions(this) }
//    }

};


/**
 * Create new object, inherited from parent, and have all properties from Clone.prototype.
 * @param parent
 * @param properties
 * @param defaultDescriptor
 * @returns {Object|$object}
 * @static
 */
$object.clone.call;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// make methods not enumerable:
$object./*re*/defineProperties($object);

//export for nodejs:
if(typeof(module)!='undefined' && module.exports) module.exports = $object;


if(0)//need for IDEa code inspections
/**
 * Object, that has at least one of the following property: <br>
 * value, get, set, writable, configurable, enumerable.
 * @name PropertyDescriptor
 * @typedef {({value:*}|{get:{function():*}}|{set:{function(*):void}}|{writable:boolean}|{configurable:boolean}|{enumerable:boolean})} */
PropertyDescriptor;

/**
 * JavaScript class. Function, that can be called by "new" operator and/or have modified prototype property.
 * @name FunctionType
 * @typedef {Function} */
