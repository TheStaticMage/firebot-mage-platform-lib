import { AngularJsFactory, UIExtension } from '@crowbartools/firebot-custom-scripts-types/types/modules/ui-extension-manager';
import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';

/**
 * Storage for modules passed to initializeErrorModal
 * Each modal name gets its own modules reference
 */
const modalModulesRegistry = new Map<string, ScriptModules>();

/**
 * Configuration for creating a custom error modal
 */
export interface ErrorModalConfig {
    /**
     * Name of the error modal (e.g., "my-integration")
     * Used for event names and UI extension ID
     */
    modalName: string;

    /**
     * Optional logger for debug output
     */
    logger?: {
        debug: (msg: string) => void;
        error: (msg: string) => void;
    };
}

/**
 * Creates a reusable error modal UI extension
 *
 * The error modal factory creates a custom Angular modal dialog that integrations can use
 * to display errors to the user. It supports HTML content (with markdown conversion).
 *
 * @param config Configuration for the error modal
 * @returns Object with UIExtension and helper functions
 *
 * @example
 * const { extension, waitForErrorModal, showErrorModal } = createErrorModal({
 *     modalName: 'my-integration'
 * });
 *
 * // In Firebot backend script:
 * await waitForErrorModal(modules, logger);
 * showErrorModal('Error Title', 'Error message with <strong>HTML</strong>');
 */
export function createErrorModal(config: ErrorModalConfig) {
    const { modalName, logger } = config;
    const readyEventName = `${modalName}:error-modal-ready`;
    const showErrorEventName = `${modalName}:show-error`;

    /**
     * IMPLEMENTATION NOTE: Custom Modal via $templateCache Injection
     *
     * Firebot's scripting system does not expose a public API for custom script-defined modals.
     * The only built-in modal components (e.g., idEntryModal) are designed for specific use cases
     * and cannot be easily customized for arbitrary content like error messages.
     *
     * To create a custom error modal, we:
     * 1. Inject $templateCache into a factory to register a custom modal template
     * 2. Register the template as an inline string
     * 3. Use modalService.showModal() with templateUrl + controllerFunc to display it
     * 4. Leverage $sce.trustAsHtml() to safely render HTML content
     *
     * NOTE: Event names are embedded in the toString() method to survive serialization
     */
    const errorModalService: AngularJsFactory = {
        name: `${modalName}ErrorModalService`,
        // Create the factory function with a custom toString that embeds values
        function: Object.defineProperty(
            function($templateCache: any, modalService: any, backendCommunicator: any, $sce: any) {
                const showErrorEventName = `${modalName}:show-error`;
                const readyEventName = `${modalName}:error-modal-ready`;
                const templateId = `${modalName}ErrorModal.html`;

                // Register custom error modal template
                $templateCache.put(templateId, `
                    <div class="modal-header">
                        <button type="button" class="close" ng-click="dismiss()">
                            <span>&times;</span>
                        </button>
                        <h4 class="modal-title">
                            <i class="fa fa-exclamation-circle"></i>
                            {{errorTitle}}
                        </h4>
                    </div>
                    <div class="modal-body">
                        <div class="error-content" ng-bind-html="errorMessage"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" ng-click="close()">OK</button>
                    </div>
                `);

                // Expose a function to show error modals
                const showError = (title: string, message: string) => {
                    modalService.showModal({
                        templateUrl: templateId,
                        size: 'md',
                        windowClass: `${modalName}-error-modal-custom`,
                        controllerFunc: function($scope: any, $uibModalInstance: any) {
                            $scope.errorTitle = title;
                            $scope.errorMessage = $sce.trustAsHtml(message);

                            $scope.dismiss = function() {
                                $uibModalInstance.dismiss();
                            };

                            $scope.close = function() {
                                $uibModalInstance.close();
                            };
                        }
                    });
                };

                // Listen for error events from the backend
                backendCommunicator.on(
                    showErrorEventName,
                    (data: { title?: string; message: string }) => {
                        const title = data.title || `${modalName} Error`;
                        showError(title, data.message);
                    }
                );

                // Signal to backend that error modal service is ready
                backendCommunicator.fireEventAsync(readyEventName, {}).catch(() => {
                    // Ignore errors if no one is listening
                });

                return {
                    showError
                };
            },
            'toString',
            {
                value: function() {
                    return `['$templateCache', 'modalService', 'backendCommunicator', '$sce', function($templateCache, modalService, backendCommunicator, $sce) {
                        const showErrorEventName = '${modalName}:show-error';
                        const readyEventName = '${modalName}:error-modal-ready';
                        const templateId = '${modalName}ErrorModal.html';
                        $templateCache.put(templateId, '<div class="modal-header"><button type="button" class="close" ng-click="dismiss()"><span>&times;</span></button><h4 class="modal-title"><i class="fa fa-exclamation-circle"></i>{{errorTitle}}</h4></div><div class="modal-body"><div class="error-content" ng-bind-html="errorMessage"></div></div><div class="modal-footer"><button type="button" class="btn btn-primary" ng-click="close()">OK</button></div>');
                        const showError = (title, message) => {
                            modalService.showModal({
                                templateUrl: templateId,
                                size: 'md',
                                windowClass: '${modalName}-error-modal-custom',
                                controllerFunc: function($scope, $uibModalInstance) {
                                    $scope.errorTitle = title;
                                    $scope.errorMessage = $sce.trustAsHtml(message);
                                    $scope.dismiss = function() { $uibModalInstance.dismiss(); };
                                    $scope.close = function() { $uibModalInstance.close(); };
                                }
                            });
                        };
                        backendCommunicator.on(showErrorEventName, (data) => {
                            const title = data.title || '${modalName} Error';
                            showError(title, data.message);
                        });
                        backendCommunicator.fireEventAsync(readyEventName, {}).catch(() => {});
                        return { showError };
                    }]`;
                }
            }
        ) as any
    };

    /**
     * UI Extension configuration for the error modal service
     */
    const extension: UIExtension = {
        id: `${modalName}:error-modal`,
        providers: {
            factories: [errorModalService]
        }
    };

    /**
     * Waits for the error modal to be initialized
     * @param modules ScriptModules from RunRequest
     * @param timeoutMs How long to wait before timing out (default 5000ms)
     * @returns Promise that resolves when error modal is ready
     */
    async function waitForErrorModal(
        modules: ScriptModules,
        timeoutMs = 5000
    ): Promise<void> {
        return new Promise((resolve) => {
            const { frontendCommunicator } = modules;

            const timeout = setTimeout(() => {
                const errorMsg = `${modalName} error modal did not initialize within ${timeoutMs}ms`;
                logger?.error(errorMsg);
                // Resolve anyway to allow continuation
                resolve();
            }, timeoutMs);

            frontendCommunicator.on(readyEventName, () => {
                clearTimeout(timeout);
                logger?.debug(`${modalName} error modal is ready`);
                resolve();
            });
        });
    }

    /**
     * Shows an error modal from the backend
     * @param title Title of the error dialog
     * @param message HTML message to display (can include HTML tags)
     */
    async function showErrorModal(title: string, message: string): Promise<void> {
        logger?.debug(`${modalName} sending error modal request: ${title}`);

        // Retrieve modules from registry
        const modules = modalModulesRegistry.get(modalName);
        if (!modules?.frontendCommunicator) {
            throw new Error(
                `${modalName} error modal not initialized. Did you call initializeErrorModal()?`
            );
        }

        const { frontendCommunicator } = modules;
        frontendCommunicator.send(showErrorEventName, { title, message });
    }

    return {
        extension,
        waitForErrorModal,
        showErrorModal
    };
}

/**
 * Initializes and waits for a custom error modal
 *
 * This is a convenience function that combines registering the error modal UI extension,
 * storing module references, and waiting for it to be ready.
 *
 * @param modalName Name of the error modal
 * @param modules ScriptModules from RunRequest
 * @param logger Optional logger for debug output
 * @param timeoutMs How long to wait for modal to initialize (default 5000ms)
 * @returns Promise that resolves when error modal is fully initialized
 *
 * @example
 * await initializeErrorModal('my-integration', runRequest.modules, logger);
 * await showErrorModal('Error', 'Something went wrong!');
 */
export async function initializeErrorModal(
    modalName: string,
    modules: ScriptModules,
    logger?: { debug: (msg: string) => void; error: (msg: string) => void },
    timeoutMs?: number
): Promise<void> {
    const { extension, waitForErrorModal } = createErrorModal({
        modalName,
        logger
    });

    // Register the error modal UI extension
    const uiExtensionManager = modules.uiExtensionManager;
    if (!uiExtensionManager) {
        throw new Error('UI Extension Manager not available');
    }

    logger?.debug(`${modalName} registering error modal UI extension...`);
    uiExtensionManager.registerUIExtension(extension);

    // Store modules for later use by showErrorModal
    modalModulesRegistry.set(modalName, modules);

    // Wait for error modal to initialize
    await waitForErrorModal(modules, timeoutMs);
}
