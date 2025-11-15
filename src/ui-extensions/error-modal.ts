import {
    AngularJsFactory,
    UIExtension
} from "@crowbartools/firebot-custom-scripts-types/types/modules/ui-extension-manager";

/**
 * IMPLEMENTATION NOTE: Custom Modal via $templateCache Injection
 *
 * Firebot's scripting system does not expose a public API for custom script-defined modals.
 * The only built-in modal components (e.g., idEntryModal) are designed for specific use cases
 * and cannot be easily customized for arbitrary content like error messages.
 *
 * To create a custom error modal, we:
 * 1. Inject $templateCache into a factory to register a custom modal template
 * 2. Register the template as an inline string (magePlatformLibErrorModal.html)
 * 3. Use modalService.showModal() with templateUrl + controllerFunc to display it
 * 4. Leverage $sce.trustAsHtml() to safely render HTML content (converted from markdown)
 *
 * This approach works around Firebot's lack of:
 * - A script-facing modal registry or factory
 * - Support for loading external modal templates in the bundled environment
 * - Clean injection of custom modal components
 *
 * The workaround is necessary because Firebot does not provide an alternative mechanism
 * for scripts to define their own modal dialogs beyond using existing built-in components.
 */

const errorModalService: AngularJsFactory = {
    name: "magePlatformLibErrorModalService",
    function: ($templateCache: any, modalService: any, backendCommunicator: any, $sce: any) => {
        // Register custom error modal template
        $templateCache.put('magePlatformLibErrorModal.html', `
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
        const showErrorModal = (title: string, message: string) => {
            modalService.showModal({
                templateUrl: "magePlatformLibErrorModal.html",
                size: "md",
                windowClass: "mage-error-modal-custom",
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
        backendCommunicator.on("mage-platform-lib:show-error", (data: { title?: string; message: string }) => {
            const title = data.title || "Mage Platform Library Error";
            showErrorModal(title, data.message);
        });

        // Signal to backend that error modal service is ready
        backendCommunicator.fireEventAsync("mage-platform-lib:error-modal-ready", {}).catch(() => {
            // Ignore errors if no one is listening
        });

        return {
            showErrorModal
        };
    }
};

export const errorModalExtension: UIExtension = {
    id: "mage-platform-lib:error-modal",
    providers: {
        factories: [errorModalService]
    }
};
