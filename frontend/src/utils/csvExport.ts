/**
 * Converts an array of objects to a CSV string and triggers a download.
 * @param data Array of objects to export
 * @param filename Name of the file to download (without extension)
 */
export const exportToCsv = (data: any[], filename: string) => {
    if (!data || !data.length) {
        console.warn('No data to export');
        return;
    }

    // Get headers from the first object keys
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
        headers.join(','), // Header row
        ...data.map(row =>
            headers.map(header => {
                const value = row[header];
                // Handle strings that might contain commas or newlines
                if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');

    // Create a Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    // Create a temporary URL
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
