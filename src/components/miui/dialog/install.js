import Vue from 'vue'
import BaseDialog from './base.vue'
import { callFunc, isPlainObject, isFunc } from '../utils'
import Checkbox from '../checkbox'
import EditText from '../edit-text/edit-text'

// https://cn.vuejs.org/v2/api/

// 创建基于组件的构造方法
const BaseDialogConstructor = Vue.extend(BaseDialog)

const NOTASSIGNED = Symbol('not-assigned')
const VUECreateElement = new Vue().$createElement
const DIALOG_CANCELED = Symbol('cancel')

// 对话框在同一时刻只能有一个实例
let curDialogInstance = null
let dialogContainer = document.body
let dialogIsShowing = false
let dialogQueue = []

const TEXT_OK = '确定'
const TEXT_CANCEL = '取消'

/* function isDialog(vm) {
    return vm instanceof BaseDialogConstructor
} */

function getCommonDialogActions(confirmCb, cancelCb) {
    let resolvedVal = NOTASSIGNED
    let rejectedReason = NOTASSIGNED
    return {
        cancel(p) {
            rejectedReason = p
        },
        confirm(s) {
            resolvedVal = s
        },
        closed() {
            if (resolvedVal !== NOTASSIGNED) {
                callFunc(confirmCb, resolvedVal)
            }
            if (rejectedReason !== NOTASSIGNED) {
                callFunc(cancelCb, DIALOG_CANCELED)
            }
            dialogIsShowing = false
            showNextDialogIfNeed()
        }
    }
}

function createDialog(options) {
    let { props, actions, children: slot } = options
    let dialogInstance = new BaseDialogConstructor({
        el: document.createElement('div'),
        propsData: props,
        created() {
            this.$slots.default = slot || []
        }
    })
    return Object.assign(dialogInstance, actions)
}

function mountDialog(options, mounted) {
    if (!dialogIsShowing) {
        curDialogInstance = createDialog(options)
        dialogContainer.appendChild(curDialogInstance.$el)
        dialogIsShowing = true
        callFunc(mounted, curDialogInstance, curDialogInstance.$el)
    } else {
        dialogQueue.push([options, mounted])
    }
}

function unmountCurrentDialog() {
    if (!dialogIsShowing && curDialogInstance) {
        curDialogInstance.$el.parentElement.removeChild(curDialogInstance.$el)
        curDialogInstance = null
    }
}

function showNextDialogIfNeed() {
    unmountCurrentDialog()
    if (dialogQueue.length > 0) {
        let [nextDialogOption, mounted] = dialogQueue.shift()
        mountDialog(nextDialogOption, mounted)
    }
}

function createCheckboxItems(chexkboxOptions = [], onChange, h = VUECreateElement) {
    let checkboxElements = []
    let length = chexkboxOptions.length

    for (let idx = 0; idx < length; idx++) {
        let option = chexkboxOptions[idx]
        let composedCb = (checked) => {
            option.checked = checked
            callFunc(onChange, checked, idx, chexkboxOptions)
        }

        checkboxElements.push(
            <div class={`checkbox-option-wrapper with-divider-${idx === (length - 1) ? '20' : '10'}`}>
                <Checkbox onChange={composedCb} label={option.label} checked={option.checked} />
            </div>
        )
    }
    return checkboxElements
}

function createinputOptions(inputOptions, h = VUECreateElement) {
    let inputElements = []
    let length = inputOptions.length

    for (let idx = 0; idx < length; idx++) {
        let option = inputOptions[idx]
        if (!Object.prototype.hasOwnProperty.call(option, 'value')) {
            option.value = ''
        }
        let onChangeCb = (value) => {
            option.value = value
        }
        inputElements.push(
            <div class={`checkbox-option-wrapper with-divider-${idx === (length - 1) ? '25' : '20'}`}>
                <EditText
                    placeholder={option.placeholder}
                    disabled={option.disabled}
                    widen
                    showPasswordButton={option.showPasswordButton}
                    showClearButton={option.showClearButton}
                    value={option.value}
                    name={option.name}
                    onChange={onChangeCb}
                    style={{ margin: 0, width: '100%' }}
                />
            </div>
        )
    }
    return inputElements
}

const dialogUtils = {
    alert(title, message, button = TEXT_OK) {
        return new Promise((resolve, reject) => {
            let alertDialogOption = {
                props: {
                    title,
                    message,
                    primaryButton: button
                },
                actions: getCommonDialogActions(resolve, reject)
            }
            mountDialog(alertDialogOption)
        })
    },

    confirm(options) {
        let { title, message, primaryButton, secondaryButton } = options
        return new Promise((resolve, reject) => {
            let confirmDialogOption = {
                props: {
                    title,
                    message,
                    primaryButton: primaryButton || TEXT_OK,
                    secondaryButton: secondaryButton || TEXT_CANCEL
                },
                actions: getCommonDialogActions(resolve, reject)
            }
            mountDialog(confirmDialogOption)
        })
    },

    confirmWithCheckbox(options) {
        let { title, message, primaryButton, secondaryButton, checkboxOptions = [] } = options
        let vm = null
        let requiredChechbox = []

        checkboxOptions.forEach(box => {
            if (typeof box.checked !== 'boolean') {
                box.checked = false
            }
            if (box.required) {
                requiredChechbox.push(box)
            }
        })

        let isAllChecked = () => !requiredChechbox.some(box => box.checked === false)

        if (!isPlainObject(primaryButton)) {
            primaryButton = {
                text: primaryButton || TEXT_OK,
                disabled: false
            }
        }

        if (requiredChechbox.length > 0) {
            primaryButton.disabled = !isAllChecked()
        }

        let checkboxSlots = createCheckboxItems(checkboxOptions, () => {
            if (vm) {
                vm.disablePrimaryButton = !isAllChecked()
            }
        })

        return new Promise((resolve, reject) => {
            let confirmDialogOption = {
                props: {
                    title,
                    message,
                    primaryButton,
                    secondaryButton: secondaryButton || TEXT_CANCEL
                },
                actions: getCommonDialogActions(resolve, reject),
                children: checkboxSlots
            }
            mountDialog(confirmDialogOption, instance => { vm = instance })
        })
    },

    prompt(options) {
        let { title, message, primaryButton, secondaryButton, inputOptions = [], validator } = options

        if (!isPlainObject(primaryButton)) {
            primaryButton = {
                text: primaryButton || TEXT_OK,
                disabled: false
            }
        }

        return new Promise((resolve, reject) => {
            let actions = getCommonDialogActions(
                () => resolve(inputOptions),
                cancelVal => reject(cancelVal)
            )

            if (isFunc(validator)) {
                actions.beforeConfirm = () => {
                    return validator(inputOptions)
                }
            }

            let promptDialogOption = {
                props: {
                    title,
                    message,
                    primaryButton,
                    secondaryButton: secondaryButton || TEXT_CANCEL
                },
                actions,
                children: createinputOptions(inputOptions)
            }
            mountDialog(promptDialogOption)
        })
    },

    popup(options) {
        let { title, message, primaryButton, secondaryButton, children } = options

        return new Promise((resolve, reject) => {
            let promptDialogOption = {
                props: {
                    title,
                    message,
                    primaryButton: primaryButton || TEXT_OK,
                    secondaryButton: secondaryButton || TEXT_CANCEL
                },
                actions: getCommonDialogActions(resolve, reject),
                children
            }
            mountDialog(promptDialogOption)
        })
    },

    whichDialog() {
        return curDialogInstance
    },

    dialogIsShowing() {
        return dialogIsShowing
    },

    queueLength() {
        return dialogQueue.length
    }
}

export const DialogCanceled = DIALOG_CANCELED

export default {
    install(Vue, root) {
        if (root instanceof HTMLDivElement) {
            dialogContainer = root
        }
        Vue.prototype.$dialog = dialogUtils
    }
}
