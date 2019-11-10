import Image from "../../types/image";
import Label from "../../types/label";

export default {
  thumbnail(label: Label) {
    if (label.thumbnail)
      return Image.getById(label.thumbnail);
    return null;
  }
}