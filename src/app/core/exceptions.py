class AppValidationError(ValueError):
    """Raised when user input or domain constraints are invalid."""


class UpstreamServiceError(RuntimeError):
    """Raised when external providers fail or return invalid payloads."""

